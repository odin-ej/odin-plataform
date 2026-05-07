"use client";
import KrakenChatContent from "@/app/_components/Dashboard/chat/KrakenChatContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { useAllowedActions } from "@/lib/auth/AllowedActionsProvider";

const ConversationPage = () => {
  // Usa o sistema dinamico de permissoes (RoutePermission do banco) propagado
  // via AllowedActionsProvider, alinhado com o layout/sidebar.
  const { canAccess } = useAllowedActions();

  if (!canAccess("/chat")) return <DeniedAccess />;

  return <KrakenChatContent />;
};

export default ConversationPage;
