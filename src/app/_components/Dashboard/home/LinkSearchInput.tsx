import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const LinkSearchInput = ({ onSearchChange }: { onSearchChange: (value: string) => void }) => (
  <div className="relative w-full max-w-xs">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <Input
      type="text"
      placeholder="Pesquisar links..."
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full rounded-lg text-xs sm:text-sm border-gray-600 bg-[#00205e] pl-10 text-white placeholder:text-gray-400 focus:ring-1 focus:ring-blue-500"
    />
  </div>
);

export default LinkSearchInput;