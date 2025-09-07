"use client";
import { FullOraculoFolder } from "@/app/(dashboard)/oraculo/page";
import { Folder, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";

const FolderCard = ({ folder, onFolderClick }: { folder: FullOraculoFolder; onFolderClick: (folder: FullOraculoFolder) => void; }) => {
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({ id: folder.id, data: { item: folder } });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: folder.id });

  return (
    <div ref={setDroppableNodeRef} className={cn("rounded-lg transition-colors", isOver && 'bg-blue-500/20 ring-2 ring-blue-500')}>
        <TooltipProvider delayDuration={300}>
        <Tooltip>
            <TooltipTrigger asChild>
            <div className={cn("bg-[#00205e]/30 p-3 rounded-lg border border-gray-700 text-center transition-all h-full relative group", isDragging && "opacity-50")}>
                <div onClick={() => onFolderClick(folder)} className="cursor-pointer flex flex-col items-center justify-center h-full">
                    <Folder className="h-16 w-16 text-[#0126fb] mb-2" />
                    <p className="text-sm font-medium truncate w-full text-white">{folder.name}</p>
                </div>
                {folder.googleDriveFolderId ? null : (
                  <div ref={setDraggableNodeRef} {...listeners} {...attributes} className="absolute top-1 right-1 p-1 cursor-grab text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                </div>
                )}
            </div>
            </TooltipTrigger>
            <TooltipContent className='bg-[#0126fb]'><p>{folder.name}</p></TooltipContent>
        </Tooltip>
        </TooltipProvider>
    </div>
  );
};
export default FolderCard;