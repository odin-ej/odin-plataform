"use client";
import KrakenChatContent from "@/app/_components/Dashboard/chat/KrakenChatContent";
import DeniedAccess from "@/app/_components/Global/DeniedAccess";
import { verifyAccess } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const ConversationPage = () => {
  const { user } = useAuth();

  const hasAccess = verifyAccess({
    pathname: `/chat`,
    user: user!,
  });
  if (!hasAccess) return <DeniedAccess />;

  return <KrakenChatContent />;
};

export default ConversationPage;
