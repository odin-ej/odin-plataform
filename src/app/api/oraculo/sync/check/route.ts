import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { google } from "googleapis";
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

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[] | null;
}

// Busca recursiva de metadados de todos os itens no Drive.
async function fetchAllDriveItems(folderId: string): Promise<DriveItem[]> {
  let pageToken: string | undefined;
  const allItems: DriveItem[] = [];
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, parents)",
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

// --- ROTA DA API DE VERIFICAÇÃO ---
export async function POST() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }
    
    await prisma.syncLog.create({
      data: { service: "GOOGLE_DRIVE_SYNC", status: "STARTED", details: `Iniciado por ${authUser.name}` },
    });

    console.log("SYNC CHECK API: Buscando metadados do Google Drive...");
    const allDriveItems = await fetchAllDriveItems(ROOT_FOLDER_ID);

    console.log("SYNC CHECK API: Buscando dados locais para comparação...");
    const localFiles = await prisma.oraculoFile.findMany({
      where: { googleDriveFileId: { not: null } },
      select: { googleDriveFileId: true, googleDriveModifiedTime: true },
    });

    // --- SINCRONIZAÇÃO DE PASTAS ---
    console.log("SYNC CHECK API: Sincronizando estrutura de pastas...");
    const driveFolders = allDriveItems.filter(
      (it) => it.mimeType === "application/vnd.google-apps.folder"
    );

    // Garante que todas as pastas existam
    if (driveFolders.length > 0) {
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
    }
    
    // Atualiza a hierarquia
    const allLocalFolders = await prisma.oraculoFolder.findMany({ where: { googleDriveFolderId: { not: null } } });
    const driveIdToLocalIdMap = new Map(allLocalFolders.map((f) => [f.googleDriveFolderId!, f.id]));
    
    if (driveFolders.length > 0) {
        await prisma.$transaction(
            driveFolders.map((driveFolder) => {
                const parentDriveId = driveFolder.parents?.[0];
                const parentLocalId = parentDriveId ? driveIdToLocalIdMap.get(parentDriveId) : null;
                return prisma.oraculoFolder.update({
                    where: { googleDriveFolderId: driveFolder.id },
                    data: { parentId: parentLocalId },
                });
            })
        );
    }

    // --- FILTRAGEM DE ARQUIVOS ---
    const localFileMap = new Map(
      localFiles.map((f) => [f.googleDriveFileId!, f])
    );

    const filesToSync = allDriveItems.filter((driveItem) => {
      if (driveItem.mimeType === "application/vnd.google-apps.folder") return false;
      const localFile = localFileMap.get(driveItem.id);
      if (!localFile) return true; // Arquivo novo
      return new Date(localFile.googleDriveModifiedTime!) < new Date(driveItem.modifiedTime); // Arquivo modificado
    });
    
    console.log(`SYNC CHECK API: ${filesToSync.length} arquivos para sincronizar.`);

    // Retorna a lista de IDs de arquivos que precisam ser processados
    return NextResponse.json({
      filesToProcess: filesToSync.map(item => ({id: item.id, name: item.name})),
    });

  } catch (error) {
    console.error("SYNC CHECK API: Erro crítico.", error);
    await prisma.syncLog.create({
      data: { service: "GOOGLE_DRIVE_SYNC", status: "FAILED", details: (error as Error).message },
    });
    return NextResponse.json(
      { message: "Ocorreu um erro inesperado durante a verificação." },
      { status: 500 }
    );
  }
}

