import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { CircleAlert } from "lucide-react";

interface ModalConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  warningMessage?: string;
  isLoading?: boolean;
}

const ModalConfirm = ({
  open,
  onCancel,
  onConfirm,
  title = "Tem certeza que deseja excluir este item?",
  description = "Essa ação não pode ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  warningMessage,
  isLoading,
}: ModalConfirmProps) => {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          className="bg-[#010d26] text-white border-2 border-[#0126fb]/30 shadow-xl max-w-[480px] w-[90%]"
          style={{ backgroundColor: "#010d26" }}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <CircleAlert className="h-36 w-36 text-red-500" />
          </div>

          <DialogHeader className="text-center mt-4 space-y-2">
            <DialogTitle className="text-lg md:text-xl text-red-500 text-center font-bold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm md:text-base">
              {description}
            </DialogDescription>
          </DialogHeader>

          {warningMessage && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-red-500text-sm text-center font-semibold">
                {warningMessage}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4">
            <Button
              variant="ghost"
              className="hover:bg-[#0126fb]/30 hover:text-white text-white"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
            <Button
              disabled={isLoading}
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {!isLoading ? confirmText : "Carregando..."}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default ModalConfirm;
