"use client"

import { useEffect } from "react";
import { updateHeartbeat } from "@/lib/actions/user";

export function UserHeartbeat({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    // Atualiza assim que monta
    updateHeartbeat(userId);

    // Define um intervalo para atualizar a cada 3 minutos
    const interval = setInterval(() => {
      updateHeartbeat(userId);
    }, 1000 * 60 * 3); 

    return () => clearInterval(interval);
  }, [userId]);

  return null; // Componente invisível
}