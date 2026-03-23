import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <span className="text-sm text-gray-400">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
       
        className="bg-[#00205e] text-white border-none hover:bg-[#00205e]/70 hover:!text-[#f5b719]"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="bg-[#00205e] text-white border-none hover:bg-[#00205e]/70 hover:!text-[#f5b719]"
      >
        Próximo
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Pagination