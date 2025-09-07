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
import { z } from "zod";

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
const BUCKET_NAME = process.env.ORACULO_S3_BUCKET_NAME!;

// --- TIPOS E VALIDAÇÃO ---
const processFileSchema = z.object({
  fileId: z.string(),
});

interface DriveFileDetails {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string | null;
    parents?: string[] | null;
}

// --- FUNÇÕES AUXILIARES ---
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function downloadOrExportFile(driveItem: DriveFileDetails) {
  const { mimeType, id } = driveItem;
  const exportTypes: Record<string, string> = {
    "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  if (exportTypes[mimeType]) {
    return drive.files.export({ fileId: id, mimeType: exportTypes[mimeType], supportsAllDrives: true } as any, { responseType: "stream" });
  }
  return drive.files.get({ fileId: id, alt: "media", supportsAllDrives: true }, { responseType: "stream" });
}

// --- ROTA DA API DE PROCESSAMENTO ---
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const { fileId } = processFileSchema.parse(body);

    console.log(`PROCESS FILE API: Iniciando processamento para fileId: ${fileId}`);

    // 1. Obter metadados do arquivo do Drive
    const { data: driveItem } = await drive.files.get({
        fileId,
        fields: "id, name, mimeType, modifiedTime, size, parents",
        supportsAllDrives: true,
    });

    // 2. Baixar/Exportar o arquivo
    const fileRes = await downloadOrExportFile(driveItem as DriveFileDetails);
    if (!fileRes) throw new Error("Falha no download do arquivo do Google Drive.");

    const buffer = await streamToBuffer(fileRes.data as Readable);
    
    // 3. Fazer upload para o S3
    const key = `oraculo/${driveItem.id}/${driveItem.name!.replace(/\s/g, "_")}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: driveItem.mimeType || "application/octet-stream",
      })
    );

    // 4. Atualizar o banco de dados
    const parentDriveId = driveItem.parents?.[0];
    let localParentId: string | null = null;
    if (parentDriveId) {
        const parentFolder = await prisma.oraculoFolder.findUnique({ where: { googleDriveFolderId: parentDriveId } });
        if(parentFolder) localParentId = parentFolder.id;
    }

    await prisma.oraculoFile.upsert({
      where: { googleDriveFileId: driveItem.id! },
      update: {
        name: driveItem.name!,
        key,
        fileType: driveItem.mimeType!,
        size: Number(driveItem.size) || 0,
        googleDriveModifiedTime: new Date(driveItem.modifiedTime!),
        folderId: localParentId,
      },
      create: {
        name: driveItem.name!,
        key,
        fileType: driveItem.mimeType!,
        size: Number(driveItem.size) || 0,
        ownerId: authUser.id,
        folderId: localParentId,
        googleDriveFileId: driveItem.id!,
        googleDriveModifiedTime: new Date(driveItem.modifiedTime!),
      },
    });
    
    console.log(`PROCESS FILE API: Sucesso para fileId: ${fileId}`);
    return NextResponse.json({ message: "Arquivo processado com sucesso!" });

  } catch (error) {
    console.error("PROCESS FILE API: Erro crítico.", error);
     // Se for um erro de validação do Zod
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: "Dados inválidos.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: (error as Error).message || "Erro ao processar arquivo." }, { status: 500 });
  }
}

