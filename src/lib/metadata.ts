
import type { Metadata } from 'next';

// Define os argumentos que a nossa função pode receber
type Props = {
  title: string;
  description?: string;
  // Pode adicionar mais argumentos como 'imageUrl', etc.
}

// A função que constrói o objeto de metadados
export function constructMetadata({
  title,
  description = "Plataforma de gestão para a Empresa Junior de Administração da UFBA.", // Descrição padrão
}: Props): Metadata {
  return {
    title,
    description,
    icons: {
      icon: "/favicon.ico",
    },
    // Pode adicionar metadados padrão aqui, como para redes sociais:
    openGraph: {
      title,
      description,
      // images: [ ... ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // images: [ ... ]
    },
  };
}