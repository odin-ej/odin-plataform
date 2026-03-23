// app/not-found.tsx

import { constructMetadata } from "@/lib/metadata";
import Link from "next/link";

export const metadata = constructMetadata({ title: "Página Nao Encontrada" });

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#010d26] text-white flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold mb-4 text-[#ff4c4c]">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Página não encontrada</h2>
      <p className="text-gray-300 max-w-md mb-6">
        Opa! Parece que você entrou em uma dimensão paralela... Essa página não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="bg-white text-[#010d26] font-semibold px-6 py-3 rounded-lg shadow-lg hover:text-[#0126fb] hover:bg-gray-100 transition"
      >
        Voltar para a Home
      </Link>
    </div>
  );
}
