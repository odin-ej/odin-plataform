/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { google } from "googleapis";
import { s3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

// --- CONFIGURAÇÃO INICIAL ---
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const credentials = JSON.parse(process.env.GOOGLE_ORACULO_CREDENTIALS_JSON!);
const jwtClient = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: SCOPES,
  subject: process.env.GOOGLE_ORACULO_EMAIL_TO_IMPERSONATE,
});
const drive = google.drive({ version: "v3", auth: jwtClient });
const ROOT_FOLDER_ID = process.env.GOOGLE_ORACULO_ROOT_FOLDER_ID!;
const BUCKET_NAME = process.env.ORACULO_S3_BUCKET_NAME!;

// --- TIPOS E INTERFACES ---
interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string | null;
  parents?: string[] | null;
}

// --- FUNÇÕES AUXILIARES ---

// Busca recursiva de metadados de todos os itens no Drive.
async function fetchAllDriveItems(folderId: string): Promise<DriveItem[]> {
  let pageToken: string | undefined;
  const allItems: DriveItem[] = [];
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, size, parents)",
      pageSize: 1000,
      pageToken,
      corpora: "allDrives",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    if (res.data.files) {
      allItems.push(...(res.data.files as DriveItem[]));
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  const subFolders = allItems.filter(
    (item) => item.mimeType === "application/vnd.google-apps.folder"
  );
  for (const subFolder of subFolders) {
    const subItems = await fetchAllDriveItems(subFolder.id);
    allItems.push(...subItems);
  }
  return allItems;
}

// Lógica de download/exportação com retentativas.
function downloadOrExportFile(driveItem: DriveItem) {
  const { mimeType, id } = driveItem;
  const exportTypes: Record<string, string> = {
    "application/vnd.google-apps.spreadsheet":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.document":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.presentation":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  if (exportTypes[mimeType]) {
    return drive.files.export(
      {
        fileId: id,
        mimeType: exportTypes[mimeType],
        supportsAllDrives: true,
      } as any,
      { responseType: "stream" }
    );
  }
  return drive.files.get(
    { fileId: id, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
}

async function downloadWithRetries(driveItem: DriveItem, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await downloadOrExportFile(driveItem);
    } catch (error: any) {
      if (
        (error.code === "ECONNRESET" || error.code === 403) &&
        attempt < maxRetries
      ) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `Tentativa de download ${attempt} falhou para "${
            driveItem.name
          }". Tentando novamente em ${delay / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// --- ROTA DA API DE SINCRONIZAÇÃO ---
export async function POST() {
  const syncLog = await prisma.syncLog.create({
    data: { service: "GOOGLE_DRIVE_SYNC", status: "STARTED" },
  });
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    // --- ETAPA 1: BUSCA DE DADOS ---
    console.log("SYNC API: Buscando metadados do Google Drive...");
    const allDriveItems = await fetchAllDriveItems(ROOT_FOLDER_ID);

    console.log("SYNC API: Buscando dados locais para comparação...");
    const [localFiles, localFolders] = await Promise.all([
      prisma.oraculoFile.findMany({
        where: { googleDriveFileId: { not: null } },
      }),
      prisma.oraculoFolder.findMany({
        where: { googleDriveFolderId: { not: null } },
      }),
    ]);

    // --- ETAPA 2: SINCRONIZAÇÃO DE PASTAS ---
    console.log("SYNC API: Sincronizando estrutura de pastas...");
    const driveFolders = allDriveItems.filter(
      (it) => it.mimeType === "application/vnd.google-apps.folder"
    );

    await prisma.$transaction(
      driveFolders.map((driveFolder) =>
        prisma.oraculoFolder.upsert({
          where: { googleDriveFolderId: driveFolder.id },
          update: { name: driveFolder.name },
          create: {
            name: driveFolder.name,
            googleDriveFolderId: driveFolder.id,
            ownerId: authUser.id,
          },
        })
      )
    );

    const allLocalFoldersNow = await prisma.oraculoFolder.findMany({
      where: { googleDriveFolderId: { not: null } },
    });
    const driveIdToLocalIdMap = new Map(
      allLocalFoldersNow.map((f) => [f.googleDriveFolderId!, f.id])
    );

    await prisma.$transaction(
      driveFolders.map((driveFolder) => {
        const parentDriveId = driveFolder.parents?.[0];
        const parentLocalId = parentDriveId
          ? driveIdToLocalIdMap.get(parentDriveId)
          : null;
        return prisma.oraculoFolder.update({
          where: { googleDriveFolderId: driveFolder.id },
          data: { parentId: parentLocalId },
        });
      })
    );

    const finalDriveToLocalFolderMap = new Map(
      localFolders.map((f) => [f.googleDriveFolderId!, f.id])
    );

    // --- ETAPA 3: SINCRONIZAÇÃO DE ARQUIVOS (NOVOS E MODIFICADOS) ---
    const localFileMap = new Map(
      localFiles.map((f) => [f.googleDriveFileId!, f])
    );
    const filesToSync = allDriveItems.filter((driveItem) => {
      if (driveItem.mimeType === "application/vnd.google-apps.folder")
        return false;
      const localFile = localFileMap.get(driveItem.id);
      if (!localFile) return true; // Arquivo novo.
      return (
        new Date(localFile.googleDriveModifiedTime!) <
        new Date(driveItem.modifiedTime)
      ); // Arquivo modificado.
    });

    let filesUpdatedCount = 0;
    if (filesToSync.length > 0) {
      console.log(`SYNC API: Sincronizando ${filesToSync.length} arquivos...`);
      for (const driveItem of filesToSync) {
        try {
          const fileRes = await downloadWithRetries(driveItem);
          if (!fileRes) continue;

          const buffer = await streamToBuffer(fileRes.data as Readable);
          const key = `oraculo/${driveItem.id}/${driveItem.name.replace(
            /\s/g,
            "_"
          )}`;

          await s3Client.send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: driveItem.mimeType || "application/octet-stream",
            })
          );

          const parentDriveId = driveItem.parents?.[0];
          const localParentId = parentDriveId
            ? finalDriveToLocalFolderMap.get(parentDriveId)
            : null;

          await prisma.oraculoFile.upsert({
            where: { googleDriveFileId: driveItem.id },
            update: {
              name: driveItem.name,
              key,
              fileType: driveItem.mimeType,
              size: Number(driveItem.size) || 0,
              googleDriveModifiedTime: new Date(driveItem.modifiedTime),
              folderId: localParentId,
            },
            create: {
              name: driveItem.name,
              key,
              fileType: driveItem.mimeType,
              size: Number(driveItem.size) || 0,
              ownerId: authUser.id,
              folderId: localParentId,
              googleDriveFileId: driveItem.id,
              googleDriveModifiedTime: new Date(driveItem.modifiedTime),
            },
          });
          filesUpdatedCount++;
        } catch (error: any) {
          console.error(
            `SYNC API: Falha ao processar o arquivo "${driveItem.name}". Erro: ${error.message}`
          );
        }
      }
    }

    // --- ETAPA 4: RESPOSTA ---
    const successMessage = `Sincronização concluída! ${filesUpdatedCount} arquivos foram atualizados.`;
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "SUCCESS",
        details: successMessage,
        finishedAt: new Date(),
      },
    });
    return NextResponse.json({
      message: `Sincronização concluída! ${filesUpdatedCount} arquivos foram atualizados. Nenhum item foi removido.`,
      filesUpdated: filesUpdatedCount,
      itemsRemoved: 0,
    });
  } catch (error: any) {
    console.error("SYNC API: Erro crítico durante a sincronização.", error);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        details: error.message,
        finishedAt: new Date(),
      },
    });
    return NextResponse.json(
      { message: "Ocorreu um erro inesperado durante a sincronização." },
      { status: 500 }
    );
  }
}
