"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Amplify } from "aws-amplify";
import {
  getCurrentUser,
  fetchAuthSession,
  signOut,
  fetchUserAttributes,
} from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { MemberWithFullRoles } from "../schemas/memberFormSchema";

try {
  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId: process.env
            .NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID as string,
          userPoolClientId: process.env
            .NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID as string,
        },
      },
    },
    { ssr: true }
  );
} catch (error) {
  console.error("Erro ao configurar o Amplify:", error);
}

export type CombinedUser = MemberWithFullRoles & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes?: any;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: CombinedUser | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  incrementMessageCount: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CombinedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // CORREÇÃO: A função `checkAuth` agora pode ser chamada sem acionar o ecrã de carregamento global.
  const checkAuth = async (isInitialLoad = false) => {
    // Apenas ativa o estado de carregamento global no carregamento inicial da aplicação.
    if (isInitialLoad) setIsLoading(true);

    try {
      const { tokens } = await fetchAuthSession();
      if (tokens) {
        const cognitoUser = await getCurrentUser();
        const [attributes, dbUserResponse] = await Promise.all([
          fetchUserAttributes(),
          fetch(`/api/users/${cognitoUser.userId}`),
        ]);

        if (!dbUserResponse.ok) {
          throw new Error("Utilizador não encontrado no banco de dados.");
        }

        const dbUser: MemberWithFullRoles = await dbUserResponse.json();
        const combinedUser: CombinedUser = { ...dbUser, attributes };

        setUser(combinedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Verificação de autenticação falhou:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      await signOut();
      await checkAuth();
      router.replace("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const incrementMessageCount = () => {
    setUser(currentUser => {
      if (!currentUser) return null;
      return {
        ...currentUser,
        dailyMessageCount: currentUser.dailyMessageCount + 1,
      };
    });
  };

  // Executa a verificação de autenticação uma vez, indicando que é o carregamento inicial.
  useEffect(() => {
    checkAuth(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, isLoading, checkAuth, logout, incrementMessageCount }}
    >
      {/* O ecrã de carregamento agora só aparece no início. */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
