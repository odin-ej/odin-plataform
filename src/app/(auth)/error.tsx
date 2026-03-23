'use client'

import Link from 'next/link';
import { useEffect } from 'react';

// Componente de erro para o fluxo de autenticação
const AuthError = ({ error, reset }: { error: Error; reset: () => void }) => {

  useEffect(() => {
    // Log do erro de autenticação para um serviço de monitoramento
    console.error("Auth Flow Error:", error);
  }, [error]);

  return (
    <div className="bg-[#00205e] min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white antialiased">
      <div className="bg-[#010d26] w-full max-w-2xl mx-auto p-8 md:p-16 rounded-2xl shadow-2xl text-center transform transition-all duration-300 hover:scale-105">
        
        {/* Ícone de cadeado */}
        <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-[#00205e]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#f5b719]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Título do erro */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#f5b719] drop-shadow-lg">
          Falha na Autenticação
        </h1>
        
        {/* Mensagem para o usuário */}
        <p className="mt-4 text-lg text-gray-300">
          Não foi possível validar seu acesso. Verifique suas credenciais e tente novamente ou contate o suporte.
        </p>

        {/* Detalhes do erro (para ambiente de desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-[#00205e] rounded-lg text-left text-sm text-red-400 overflow-x-auto">
            <code className="whitespace-pre-wrap">{error?.message || 'Erro de autenticação desconhecido'}</code>
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-[#0126fb] hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
          >
            Tentar Novamente
          </button>
          <Link
            href="/login" // Redireciona para a página de login
            className="w-full sm:w-auto bg-transparent border-2 border-[#f5b719] hover:bg-[#f5b719] text-[#f5b719] hover:text-[#010d26] font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthError;
