import { google, drive_v3 } from "googleapis";

/**
 * Google Drive client for the Kraken knowledge system.
 * Uses a Service Account to access shared Drive folders.
 *
 * Required env vars:
 *   GOOGLE_DRIVE_CLIENT_EMAIL  — Service Account email
 *   GOOGLE_DRIVE_PRIVATE_KEY   — Service Account private key (PEM, with \n)
 */

let _driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (_driveClient) return _driveClient;

  // Try dedicated Drive env vars first, then fall back to the shared Google credentials
  let clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

  // Fall back to GOOGLE_APPLICATION_CREDENTIALS_JSON (same used by Calendar/Oráculo)
  if ((!clientEmail || !privateKey) && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      clientEmail = clientEmail || creds.client_email;
      privateKey = privateKey || creds.private_key;
    } catch {
      // ignore parse errors
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Drive credentials missing. Set GOOGLE_DRIVE_CLIENT_EMAIL/GOOGLE_DRIVE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS_JSON."
    );
  }

  // Use GoogleAuth (works reliably across googleapis versions)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  _driveClient = google.drive({ version: "v3", auth: auth as never });
  return _driveClient;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

/**
 * List all files inside a Drive folder RECURSIVELY (enters subfolders).
 * Skips trashed files. Returns flat list with folder path in name.
 */
export async function listFolderFiles(folderId: string, parentPath = ""): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size)",
      pageSize: 100,
      pageToken,
    });

    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name || !f.mimeType || !f.modifiedTime) continue;

      // If it's a folder, recurse into it
      if (f.mimeType === "application/vnd.google-apps.folder") {
        const subPath = parentPath ? `${parentPath}/${f.name}` : f.name;
        console.log(`[Drive] Entering subfolder: ${subPath}`);
        const subFiles = await listFolderFiles(f.id, subPath);
        files.push(...subFiles);
      } else {
        // It's a file — add with full path prefix
        files.push({
          id: f.id,
          name: parentPath ? `${parentPath}/${f.name}` : f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          size: f.size ?? undefined,
        });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

/**
 * Validate that the service account can access a given folder.
 * Returns the folder name on success.
 */
export async function validateFolderAccess(
  folderId: string
): Promise<{ accessible: boolean; folderName?: string }> {
  try {
    const drive = getDriveClient();
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
    });

    if (res.data.mimeType !== "application/vnd.google-apps.folder") {
      return { accessible: false };
    }

    return { accessible: true, folderName: res.data.name ?? folderId };
  } catch {
    return { accessible: false };
  }
}

// Supported mime types for text extraction
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDE_MIME = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";
const TEXT_MIMES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
];

/**
 * Download and extract text content from a Drive file.
 * Supports Google Docs (exported as text), PDFs (raw text fallback),
 * and plain text files.
 */
export async function extractFileContent(
  fileId: string,
  mimeType: string
): Promise<string | null> {
  const drive = getDriveClient();

  try {
    // Google Docs → export as plain text
    if (mimeType === GOOGLE_DOC_MIME) {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" }
      );
      return typeof res.data === "string" ? res.data : String(res.data);
    }

    // Google Sheets → export as CSV
    if (mimeType === GOOGLE_SHEET_MIME) {
      const res = await drive.files.export(
        { fileId, mimeType: "text/csv" },
        { responseType: "text" }
      );
      return typeof res.data === "string" ? res.data : String(res.data);
    }

    // Google Slides → export as plain text
    if (mimeType === GOOGLE_SLIDE_MIME) {
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" }
      );
      return typeof res.data === "string" ? res.data : String(res.data);
    }

    // Plain text files — download directly
    if (TEXT_MIMES.some((m) => mimeType.startsWith(m))) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      return typeof res.data === "string" ? res.data : String(res.data);
    }

    // PDFs — download bytes, extract text using pdf-parse
    if (mimeType === PDF_MIME) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      const buffer = Buffer.from(res.data as ArrayBuffer);
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(buffer);
        const text = parsed.text?.trim();
        return text && text.length > 50 ? text : null;
      } catch {
        // Fallback: basic string extraction
        const rawText = buffer
          .toString("utf-8")
          .replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F]/g, " ")
          .replace(/\s{3,}/g, "\n")
          .trim();
        return rawText.length > 50 ? rawText : null;
      }
    }

    // DOCX — Google can convert via export
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Use Google Drive's built-in conversion
      const res = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" }
      );
      return typeof res.data === "string" ? res.data : String(res.data);
    }

    return null; // unsupported file type
  } catch (error) {
    console.error(`[Drive] Failed to extract content for ${fileId}:`, error);
    return null;
  }
}

/**
 * Get the service account email (for display in UI).
 */
export function getServiceAccountEmail(): string | null {
  if (process.env.GOOGLE_DRIVE_CLIENT_EMAIL) {
    return process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      return creds.client_email ?? null;
    } catch {
      return null;
    }
  }
  return null;
}
