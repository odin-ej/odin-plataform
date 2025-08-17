// src/app/(dashboard)/chat/_components/ConversationNotFound.tsx
import { SearchX, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const ConversationNotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center text-white bg-[#010d26] rounded-lg p-8">
      <SearchX className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Conversa não encontrada</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        A conversa que você está procurando não existe ou foi removida.
      </p>
      <Link href="/chat">
        <Button className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white py-2 px-4">
          <MessageCircle className="h-4 w-4 mr-2" />
          Iniciar uma nova conversa
        </Button>
      </Link>
    </div>
  );
};

export default ConversationNotFound;