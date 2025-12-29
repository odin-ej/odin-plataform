import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Providers from "./_components/Global/Providers";
import "./globals.css";
import { UserHeartbeat } from "./_components/Global/UserHeartbeat";
import { getAuthenticatedUser } from "@/lib/server-utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Plataforma Empresa JR",
    default: "Plataforma Empresa JR - Gestão da EJ de Administração da UFBA",
  },
  description:
    "Sistema oficial da Empresa Junior de Administração da UFBA. Somos a primeira Empresa Júnior da Bahia, construindo um legado de sonhos e impulsionando lideranças protagonistas.",

  keywords: [
    "Empresa Junior",
    "Administração UFBA",
    "EJ UFBA",
    "Plataforma EJ",
    "Gestão de projetos",
    "Universidade Federal da Bahia",
    "Empreendedorismo universitário",
    "Empresa Junior Bahia",
    "Desenvolvimento profissional",
    "EJ Administração",
    "Plataforma Empresa Junior",
  ],

  openGraph: {
    title: "Plataforma Empresa JR",
    description:
      "Gerencie sua jornada na primeira Empresa Junior da Bahia com uma plataforma moderna e intuitiva.",
    url: "https://empresajunior.org",
    siteName: "Plataforma Empresa JR",
    type: "website",
    images: [
      {
        url: "https://empresajunior.org/logo-amarela.png", // substitua com sua imagem de preview
        width: 1200,
        height: 630,
        alt: "Plataforma Empresa JR",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Plataforma Empresa JR",
    description:
      "Conectando talento, gestão e impacto na primeira Empresa Júnior da Bahia.",
    images: ["https://empresajunior.org/logo-amarela.png"], // substitua com imagem ideal para Twitter
    creator: "@empresaJR", // seu @ real se tiver
  },

  metadataBase: new URL("https://empresajunior.org"), // atualize com seu domínio
  alternates: {
    canonical: "https://empresajunior.org",
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/logo-amarela.png",
  },

  other: {
    instagram: "https://instagram.com/empresajr",
    email: "plataforma@empresajr.org",
  },
};
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const authUser = await getAuthenticatedUser()

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className={poppins.className}>
        <Providers>{children}</Providers>
        {authUser && <UserHeartbeat userId={authUser.id} />}
      </body>
    </html>
  );
}
