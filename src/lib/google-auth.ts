import { GoogleAuth } from "google-auth-library";

let auth: GoogleAuth | null = null;

function getGoogleAuth(): GoogleAuth {
  if (!auth) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error("A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não está definida.");
    }
    if (!process.env.GOOGLE_ADMIN_EMAIL_TO_IMPERSONATE) {
      throw new Error("A variável de ambiente GOOGLE_ADMIN_EMAIL_TO_IMPERSONATE não está definida.");
    }

    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
      clientOptions: {
        subject: process.env.GOOGLE_ADMIN_EMAIL_TO_IMPERSONATE,
      }
    });
  }
  return auth;
}

export async function getGoogleAuthToken(): Promise<string> {
  const authClient = getGoogleAuth();
  try {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("Falha ao obter o token de acesso da Conta de Serviço.");
    }
    return token;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao obter o token de acesso da Conta de Serviço:", error);
    throw new Error("Não foi possível autenticar com a Google. Verifique as credenciais e as configurações de delegação de domínio.");
  }
}