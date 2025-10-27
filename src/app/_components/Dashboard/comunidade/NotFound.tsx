import { Button } from "@/components/ui/button";
import { SearchX, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NotFoundProps {
  title: string;
  description: string;
  linkHref: string;
  linkText: string;
}

const NotFound = ({
  title = "Conteúdo Não Encontrado",
  description = "A conversa ou canal que você está procurando não existe ou você não tem permissão para acessá-lo.",
  linkHref = "/comunidade/feed",
  linkText = "Voltar para o Feed"
}: Partial<NotFoundProps>) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-8">
      <div className="bg-[#010d26] p-8 rounded-2xl border border-gray-800 max-w-md w-full flex flex-col items-center">
        <SearchX className="h-20 w-20 text-[#f5b719]/50 mb-6" strokeWidth={1.5} />
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 mb-8">{description}</p>
        <Button asChild className="bg-[#f5b719] text-white hover:bg-[#f5b719]/90 font-bold">
          <Link href={linkHref}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {linkText}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;