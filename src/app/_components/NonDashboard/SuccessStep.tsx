"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const SuccessStep = () => {

  return (
    <Card className="max-w-xl w-full bg-[#010d26] border border-[#0126fb] rounded-2xl shadow-lg">
      <CardHeader className="flex flex-col items-center gap-4">
        <ShieldCheck className="h-16 w-16 text-green-500" />
        <CardTitle className="text-4xl font-bold text-white text-center">
          Senha Redefinida!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground">
          A sua senha foi alterada com sucesso. Você já pode entrar na Casinha
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          className="text-green-500 underline hover:text-green-500 transition-all font-bold hover:bg-green-500/10"
          variant="ghost"
        >
          Entrar na Casinha dos Sonhos
        </Button>
      </CardContent>
    </Card>
  );
};
export default SuccessStep;
