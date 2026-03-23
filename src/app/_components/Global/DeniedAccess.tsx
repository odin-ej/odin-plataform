import { Lock } from "lucide-react";
import Link from "next/link";


const DeniedAccess = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-white p-8">
      <Lock className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-3xl font-bold mb-2">Acesso Negado</h1>
      <p className="text-xl text-white/70">
        Você não tem permissão para visualizar esta página.
      </p>
      <Link className="font-semibold underline mt-3 text-[#f5b719]" href="/">Volte para página inicial</Link>
    </div>
  );
};

export default DeniedAccess;
