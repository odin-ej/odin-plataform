import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Building, User } from "lucide-react";
import {
  FullJRPointsReport,
  FullJRPointsSolicitation,
} from "./SolicitationsBoard";
import { cn } from "@/lib/utils";
type RequestItem = (FullJRPointsSolicitation | FullJRPointsReport) & {
  type: "solicitation" | "report";
};
const RequestCard = ({
  item,
  onCardClick,
}: {
  item: RequestItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCardClick: (item: any) => void;
}) => (
  <div
    onClick={() => {
      console.log(item);
      onCardClick(item)
    }}
    className={cn(
      "bg-[#010d26] p-4 rounded-md border border-gray-700 cursor-pointer hover:border-[#0126fb] transition-colors group",
      item.directorsNotes &&
        (item.directorsNotes ===
          "Aprovado automaticamente via painel de administração." ||
          item.directorsNotes ===
            "Aprovado automaticamente via painel de gerenciamento.") &&
        "border-[#f5b719]"
    )}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={item.user.imageUrl ?? undefined} />
          <AvatarFallback>{item.user.name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-white">{item.user.name}</p>
          <p className="text-xs text-gray-400">
            em {format(new Date(item.createdAt), "dd/MM/yyyy")}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge
          variant={item.isForEnterprise ? "default" : "secondary"}
          className={
            item.isForEnterprise ? "bg-[#00205e]" : "bg-[#0126fb] text-white"
          }
        >
          {item.isForEnterprise ? (
            <Building className="h-3 w-3 mr-1.5" />
          ) : (
            <User className="h-3 w-3 mr-1.5" />
          )}
          {item.isForEnterprise ? "Empresa" : "Pessoal"}
        </Badge>
        <Badge
          variant={item.type === "solicitation" ? "outline" : "destructive"}
          className="border-[#f5b719] text-[#f5b719]"
        >
          {item.type === "solicitation" ? "Solicitação" : "Recurso"}
        </Badge>
      </div>
    </div>
    <p className="text-sm text-gray-300 mt-3 pt-3 border-t border-gray-700/50 group-hover:border-[#0126fb]/50 transition-colors truncate">
      {item.description}
    </p>
  </div>
);

export default RequestCard;
