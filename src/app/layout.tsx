import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Providers from "./_components/Global/Providers";
import "./globals.css"; 


const poppins = Poppins({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  
  title: {
    template: '%s | Plataforma Empresa JR',
    default: 'Plataforma Empresa JR', //
  },
  description: "Plataforma de gestão para a sua Empresa Júnior.",

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className={poppins.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
