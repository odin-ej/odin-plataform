import { GoogleAuth } from "google-auth-library";

// Variável para guardar a instância de autenticação e evitar recriá-la
let auth: GoogleAuth | null = null;

function getGoogleAuth(): GoogleAuth {
  if (!auth) {
    // Verifica se a variável de ambiente com as credenciais JSON existe
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error(
        "A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não está definida."
      );
    }

    // Parse do JSON que está na variável de ambiente
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    // Cria a instância de autenticação usando as credenciais da Conta de Serviço
    auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }
  return auth;
}

export async function getGoogleAuthToken(): Promise<string> {
  const authClient = getGoogleAuth();

  try {
    // Pede um novo token de acesso. Com uma Conta de Serviço, isto não depende
    // de um refresh token de utilizador e é muito mais estável.
    const token = await authClient.getAccessToken();

    if (!token) {
      throw new Error("Falha ao obter o token de acesso da Conta de Serviço do Google.");
    }

    return token;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao obter o token de acesso da Conta de Serviço:", error);
    throw new Error("Não foi possível autenticar com a Google usando a Conta de Serviço.");
  }
}