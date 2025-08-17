// /components/Global/Custom/FileUploadZone.tsx

import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { useCallback } from "react";
import { v4 as uuidv4 } from 'uuid'; 
import FileListItem from "./FileListItem";


export type UploadableFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  url?: string;
  source?: 'existing';
};

export interface Attachment {
  url: string;
  fileName: string;
  fileType: string;
}

interface FileUploadZoneProps {
  uploadableFiles: UploadableFile[];
  onFilesChange: (files: UploadableFile[]) => void;
  maxFiles?: number;
}

const FileUploadZone = ({ uploadableFiles, onFilesChange, maxFiles = 5 }: FileUploadZoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newUploadableFiles: UploadableFile[] = acceptedFiles.map((file) => ({
        id: uuidv4(),
        file,
        status: "pending",
        progress: 0,
      }));

      onFilesChange(
        [...uploadableFiles, ...newUploadableFiles].slice(0, maxFiles)
      );
    },
    [uploadableFiles, onFilesChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [], "image/png": [], "image/gif": [],
      "application/pdf": [], "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });

  const removeFile = (fileId: string) => {
    onFilesChange(uploadableFiles.filter((f) => f.id !== fileId));
  };

  const isOverallUploading = uploadableFiles.some(f => f.status === "uploading");

  return (
    <div className="space-y-4 mt-1">
      <div
        {...getRootProps()}
        className={`w-full p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors
        ${isDragActive ? "border-[#f5b719] bg-[#f5b719]/10" : "border-gray-600 hover:border-gray-500"}
        ${isOverallUploading ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input {...getInputProps()} disabled={isOverallUploading} />
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
          <UploadCloud className="h-8 w-8" />
          <p>Arraste e solte ou clique para selecionar</p>
          <p className="text-xs">(Imagens, PDF, DOCX, XLSX, etc.)</p>
        </div>
      </div>

      {uploadableFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-white">Arquivos Anexados:</h4>
          <ul className="space-y-2">
            {uploadableFiles.map((uploadableFile) => (
              <FileListItem
                key={uploadableFile.id}
                uploadableFile={uploadableFile}
                onRemove={removeFile}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;