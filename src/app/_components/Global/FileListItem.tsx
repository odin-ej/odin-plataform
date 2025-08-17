import React, { useMemo } from 'react';
import Image from 'next/image';
import { File as FileIcon, X, CheckCircle, AlertCircle, FileImage, FileText, FileSpreadsheet } from 'lucide-react';
import { UploadableFile } from '../Global/FileUploadZone';
import { Button } from '@/components/ui/button';

// Função para obter o ícone apropriado
const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-6 w-6 text-gray-400 flex-shrink-0" />;
    if (fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500 flex-shrink-0" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-6 w-6 text-green-500 flex-shrink-0" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-6 w-6 text-blue-500 flex-shrink-0" />;
    return <FileIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />;
};

interface FileListItemProps {
  uploadableFile: UploadableFile;
  onRemove: (fileId: string) => void;
}

const FileListItem = ({ uploadableFile, onRemove }: FileListItemProps) => {
  // CORRETO: useMemo agora está no nível superior do componente FileListItem
  const previewUrl = useMemo(() => {
    if (uploadableFile.file.type.startsWith('image/')) {
      return URL.createObjectURL(uploadableFile.file);
    }
    return null;
  }, [uploadableFile]);

  return (
    <li className="bg-[#00205e]/50 p-3 rounded-md">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-gray-300 w-full min-w-0">
          {previewUrl ? (
            <Image src={previewUrl} alt={uploadableFile.file.name} width={40} height={40} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
          ) : (
            getFileIcon(uploadableFile.file.type)
          )}
          <div className="flex flex-col truncate">
            <span className="truncate font-medium">{uploadableFile.file.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2">
          {uploadableFile.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
          {uploadableFile.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
          <Button  onClick={() => onRemove(uploadableFile.id)} className="p-1 bg-transparent rounded-full hover:bg-red-500/20">
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      {uploadableFile.status === "uploading" && (
        <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
          <div className="bg-[#f5b719] h-1.5 rounded-full" style={{ width: `${uploadableFile.progress}%` }} />
        </div>
      )}
    </li>
  );
};

// React.memo otimiza a performance, evitando re-renderizações desnecessárias do item
export default React.memo(FileListItem);