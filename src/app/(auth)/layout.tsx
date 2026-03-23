"use client";
import { useAuth } from "@/lib/auth/AuthProvider";
import Footer from "../_components/Global/Footer";
import HeaderND from "../_components/NonDashboard/Header-nd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#010d26]">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#00205e]">
      <div className="w-full">
        <HeaderND />
      </div>
      <div>{children}</div>

      <Footer />
    </div>
  );
}
