'use client'
import { CardHeader, Card, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldBan } from "lucide-react";

const Page = () => {
  return (
   <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-lg w-full bg-[#010d26] border border-[#0126fb] rounded-2xl shadow-lg">
        {/* Cabeçalho do card com a ilustração e o título */}
        <CardHeader className="flex flex-col items-center gap-4">
          {/* Altere o src se preferir outro arquivo/imagem */}
          <ShieldBan className="h-16 w-16 text-[#f5b719]" />
          <CardTitle className="text-4xl font-bold text-[#f5b719] text-center">
            Você esqueceu sua senha?
          </CardTitle>
        </CardHeader>

        {/* Conteúdo do card */}
        <CardContent className="space-y-4 text-center">
          <p className='text-muted-foreground text-xs'> Até agora não temos um sistema para recuperação de senha automática,
            então</p>
          <p className="text-white text-sm leading-relaxed">
           Para recuperar sua senha é necessário que você <b>entre em
            contato com algum Diretor atual(a)</b> da nossa Casinha dos Sonhos.
          </p>

          <p className="text-[#f5b719] text-sm italic">
            Toma cuidado para não esquecer de novo! Deixa anotado no celular,
            computador, papel, caderno, mas não esquece!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
