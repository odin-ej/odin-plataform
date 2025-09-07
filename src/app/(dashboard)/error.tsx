'use client'

import Link from 'next/link';
import { useEffect } from 'react';

// Este componente captura erros que acontecem no lado do cliente.
// O Next.js passará as props `error` e `reset`.
const Error = ({ error, reset }: { error: Error; reset: () => void }) => {

  useEffect(() => {
    // Log do erro para um serviço de monitoramento (ex: Sentry, LogRocket)
    console.error(error);
  }, [error]);

  return (
    <div className="bg-[#00205e] min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white antialiased">
      <div className="bg-[#010d26] w-full max-w-2xl mx-auto p-8 md:p-16 rounded-2xl shadow-2xl text-center transform transition-all duration-300 hover:scale-105">
        
        {/* Ícone de aviso */}
        <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-[#010d26]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#f5b719]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Título do erro */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#f5b719] drop-shadow-lg">
          Oops! Algo deu errado.
        </h1>
        
        {/* Mensagem para o usuário */}
        <p className="mt-4 text-lg text-gray-300">
          Encontramos um problema inesperado. Nossa equipe já foi notificada e está trabalhando para corrigir.
        </p>

        {/* Detalhes do erro (para ambiente de desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-[#010d26] rounded-lg text-left text-sm text-red-400 overflow-x-auto">
            <code className="whitespace-pre-wrap">{error?.message || 'Erro desconhecido'}</code>
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-[#0126fb] cursor-pointer hover:bg-[#0126fb]/90 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
          >
            Tentar Novamente
          </button>
          
          <Link
            href="/"
            className="w-full sm:w-auto bg-transparent border-2 border-[#f5b719] hover:bg-[#f5b719] text-[#f5b719] hover:text-[#010d26] font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Error;
