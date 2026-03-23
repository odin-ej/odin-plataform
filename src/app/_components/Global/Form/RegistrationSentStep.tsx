import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const RegistrationSentStep = () => {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 rounded-lg bg-[#010d26] p-8 text-white mt-8">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold text-[#f5b719]">Pedido Enviado!</h2>
      <p className="text-gray-300">
        O seu pedido de registo foi enviado com sucesso e está aguardando
        aprovação.
      </p>
      <p className="text-sm text-gray-400">
        Você receberá uma notificação por e-mail assim que a sua conta for
        criada e ativada.
      </p>
      <Link href="/login" className="w-full text-white underline">
        Voltar para o <span className="text-[#f5b719]">login</span>
      </Link>
    </div>
  );
};

export default RegistrationSentStep;
