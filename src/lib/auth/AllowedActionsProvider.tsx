"use client";

import { createContext, useContext, ReactNode } from "react";
import { AppAction } from "@/lib/permissions";

interface AllowedActionsContextType {
  allowedActions: string[];
  canDo: (action: AppAction) => boolean;
}

const AllowedActionsContext = createContext<AllowedActionsContextType>({
  allowedActions: [],
  canDo: () => false,
});

export function AllowedActionsProvider({
  children,
  allowedActions,
}: {
  children: ReactNode;
  allowedActions: string[];
}) {
  const canDo = (action: AppAction) => allowedActions.includes(action);
  return (
    <AllowedActionsContext.Provider value={{ allowedActions, canDo }}>
      {children}
    </AllowedActionsContext.Provider>
  );
}

export function useAllowedActions() {
  return useContext(AllowedActionsContext);
}
