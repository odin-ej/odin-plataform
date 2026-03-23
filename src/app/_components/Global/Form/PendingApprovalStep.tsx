"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from 'next/link';

const PendingApprovalStep = () => {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 rounded-lg p-8 text-white mt-8">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold text-[#f5b719]">Registo Concluído!</h2>
      <p className="text-gray-300">
        O seu e-mail foi verificado com sucesso. A sua conta está agora a aguardar a aprovação final por um administrador.
      </p>
      <p className="text-sm text-gray-400">
        Você receberá uma notificação por e-mail assim que o seu acesso for liberado. Agradecemos pela sua paciência!
      </p>
      <Link href="/login" passHref>
        <Button className="w-full bg-[#f5b719] hover:bg-[#0126fb]/80">
          Voltar para o Login
        </Button>
      </Link>
    </div>
  );
};

export default PendingApprovalStep;
