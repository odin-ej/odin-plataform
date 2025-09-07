/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, OraculoFile, OraculoFolder } from "@prisma/client";
import { google } from "googleapis";
import { s3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import "dotenv/config"; // Garante que as variáveis de ambiente (.env) sejam carregadas

const ADMIN_ID = process.env.ADMIN_ID;

// --- INICIALIZAÇÃO E CONFIGURAÇÃO ---
console.log("Inicializando cliente Prisma...");
const prisma = new PrismaClient();

console.log("Configurando autenticação do Google Drive...");
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

// --- INTERFACES E TIPOS ---
interface DriveItem {
    id: string; name: string; mimeType: string; modifiedTime: string;
    size?: string | null; parents?: string[] | null;
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

function downloadOrExportFile(driveItem: DriveItem) {
    const { mimeType, id, name } = driveItem;
    const exportTypes: Record<string, string> = {
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    if (exportTypes[mimeType]) {
        console.log(`  - Exportando: ${name}`);
        const requestParams = { fileId: id, mimeType: exportTypes[mimeType], supportsAllDrives: true } as any;
        return drive.files.export(requestParams, { responseType: 'stream' });
    }
    console.log(`  - Baixando: ${name}`);
    return drive.files.get({ fileId: id, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
}

async function downloadWithRetries(driveItem: DriveItem, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await downloadOrExportFile(driveItem);
    } catch (error: any) {
      if ((error.code === 'ECONNRESET' || error.code === 403) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`  - Tentativa ${attempt} falhou para "${driveItem.name}" (Erro: ${error.code}). Tentando novamente em ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Lança o erro definitivo para ser pego pelo loop principal
        throw error; 
      }
    }
  }
}

// --- LÓGICA DE BUSCA NO GOOGLE DRIVE ---
async function fetchAllDriveItems(folderId: string): Promise<DriveItem[]> {
  let pageToken: string | undefined;
  const allItems: DriveItem[] = [];
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, parents)",
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

// --- FUNÇÕES DE PROCESSAMENTO E SINCRONIZAÇÃO ---

async function processFolders(driveItems: DriveItem[], ownerId: string) {
  const folderUpserts: any[] = [];
  const driveFolders = driveItems.filter(
    (it) => it.mimeType === "application/vnd.google-apps.folder"
  );

  for (const driveFolder of driveFolders) {
    // A lógica de parentId será resolvida na transação para garantir a ordem correta
    folderUpserts.push({
      where: { googleDriveFolderId: driveFolder.id },
      update: { name: driveFolder.name },
      create: {
        name: driveFolder.name,
        googleDriveFolderId: driveFolder.id,
        ownerId,
        // O parentId será nulo por enquanto e atualizado depois
      },
    });
  }
  return folderUpserts;
}

async function processFiles(
  driveItems: DriveItem[],
  localFiles: OraculoFile[],
  driveToLocalFolderMap: Map<string, string>,
  ownerId: string
) {
  const localFileMap = new Map(localFiles.map((f) => [f.googleDriveFileId!, f]));
  const filesToSync = driveItems.filter((item) => {
    if (item.mimeType === "application/vnd.google-apps.folder") return false;
    const localFile = localFileMap.get(item.id);
    const driveModifiedTime = new Date(item.modifiedTime);
    return !localFile || new Date(localFile.googleDriveModifiedTime!) < driveModifiedTime;
  });

  const allUpsertData = [];
  for (const driveItem of filesToSync) {
    try {
      console.log(`- Processando arquivo: ${driveItem.name}`);
      const fileRes = await downloadWithRetries(driveItem);
      if (!fileRes) {
        console.warn(`  - Pulando arquivo ${driveItem.name} após falhas de download.`);
        continue;
      }
      const buffer = await streamToBuffer(fileRes.data as Readable);

      let fileName = driveItem.name;
      if (driveItem.mimeType === "application/vnd.google-apps.spreadsheet") fileName += ".xlsx";
      else if (driveItem.mimeType === "application/vnd.google-apps.document") fileName += ".docx";

      const key = `oraculo/${driveItem.id}/${fileName.replace(/\s/g, "_")}`;
      
      console.log(`  - Fazendo upload para S3...`);
      await s3Client.send(
        new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: buffer, ContentType: driveItem.mimeType || "application/octet-stream" })
      );
      
      const parentDriveId = driveItem.parents?.[0];
      const localParentId = parentDriveId ? driveToLocalFolderMap.get(parentDriveId) : null;
      const googleDriveModifiedTime = new Date(driveItem.modifiedTime);

      allUpsertData.push({
        where: { googleDriveFileId: driveItem.id },
        update: { name: driveItem.name, key, fileType: driveItem.mimeType, size: Number(driveItem.size) || 0, googleDriveModifiedTime, folderId: localParentId },
        create: { name: driveItem.name, key, fileType: driveItem.mimeType, size: Number(driveItem.size) || 0, ownerId, folderId: localParentId, googleDriveFileId: driveItem.id, googleDriveModifiedTime },
      });
    } catch (error: any) {
      console.error(`  - ERRO CRÍTICO ao processar "${driveItem.name}". Pulando. Erro: ${error.message}`);
    }
  }
  return allUpsertData;
}

async function syncAllItems(driveItems: DriveItem[], localFiles: OraculoFile[], localFolders: OraculoFolder[], ownerId: string) {
  console.log("\nETAPA 2: Processando pastas...");
  const folderUpserts = await processFolders(driveItems, ownerId);

  console.log("\nETAPA 3: Executando transação das pastas...");
  await prisma.$transaction(async (tx) => {
    console.log(`  - Sincronizando ${folderUpserts.length} pastas...`);
    for (const folderOp of folderUpserts) {
      await tx.oraculoFolder.upsert(folderOp);
    }
    
    // Agora, com todas as pastas no DB, atualizamos a hierarquia (parentId)
    console.log("  - Atualizando hierarquia de pastas...");
    const driveFolders = driveItems.filter(it => it.mimeType === "application/vnd.google-apps.folder");
    for (const driveFolder of driveFolders) {
      const parentDriveId = driveFolder.parents?.[0];
      if (parentDriveId) {
        const parentDbFolder = await tx.oraculoFolder.findUnique({ where: { googleDriveFolderId: parentDriveId } });
        if (parentDbFolder) {
          await tx.oraculoFolder.update({
            where: { googleDriveFolderId: driveFolder.id },
            data: { parentId: parentDbFolder.id },
          });
        }
      }
    }
  });

  const allLocalFolders = await prisma.oraculoFolder.findMany({ where: { googleDriveFolderId: { not: null } } });
  const driveToLocalFolderMap = new Map(allLocalFolders.map((f) => [f.googleDriveFolderId!, f.id]));

  console.log("\nETAPA 4: Processando arquivos (Downloads e Uploads)...");
  const fileUpserts = await processFiles(driveItems, localFiles, driveToLocalFolderMap, ownerId);

  console.log("\nETAPA 5: Executando transação dos arquivos...");
  if (fileUpserts.length > 0) {
    await prisma.$transaction(async (tx) => {
      console.log(`  - Sincronizando ${fileUpserts.length} arquivos...`);
      for (const fileOp of fileUpserts) {
        await tx.oraculoFile.upsert(fileOp);
      }
    });
  } else {
    console.log("  - Nenhum arquivo precisou ser sincronizado.");
  }
}

// --- FUNÇÃO PRINCIPAL DE EXECUÇÃO ---
async function main() {
  console.log("\n🟢 INICIANDO PROCESSO DE MIGRAÇÃO DO GOOGLE DRIVE...");
  const syncLog = await prisma.syncLog.create({
    data: { service: "GOOGLE_DRIVE_MIGRATION_SCRIPT", status: "STARTED" },
  });

  try {
    // ===================================================================================
    // IMPORTANTE: Defina aqui o ID do usuário que será o "dono" dos arquivos migrados.
    // Você pode encontrar o ID no seu banco de dados na tabela `User`.
    const ownerId = ADMIN_ID; 
    // ===================================================================================
    if (!ownerId) throw new Error("O 'ownerId' não foi definido. Por favor, edite o script.");

    console.log("\nETAPA 1: Buscando metadados...");
    console.log("🔍 Buscando todos os itens do Google Drive... (Isso pode levar um tempo)");
    const allDriveItems = await fetchAllDriveItems(ROOT_FOLDER_ID);
    console.log(`  - ${allDriveItems.length} itens encontrados no Drive.`);
    
    console.log("🔍 Buscando dados locais para comparação...");
    const [localFiles, localFolders] = await Promise.all([
      prisma.oraculoFile.findMany({ where: { googleDriveFileId: { not: null } } }),
      prisma.oraculoFolder.findMany({ where: { googleDriveFolderId: { not: null } } }),
    ]);
    console.log(`  - ${localFiles.length} arquivos e ${localFolders.length} pastas locais encontradas.`);

    await syncAllItems(allDriveItems, localFiles, localFolders, ownerId);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", finishedAt: new Date() },
    });
    console.log("\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");

  } catch (error: any) {
    console.error("\n❌ ERRO DURANTE A MIGRAÇÃO:", error.message);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "FAILED", details: error.message, finishedAt: new Date() },
    });
    process.exit(1);
  }
}

// --- PONTO DE ENTRADA DO SCRIPT ---
main()
  .catch((e) => {
    console.error("Um erro fatal e inesperado ocorreu:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log(" encerrando conexão com o banco de dados.");
    await prisma.$disconnect();
  });