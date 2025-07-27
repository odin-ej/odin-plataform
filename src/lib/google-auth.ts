// lib/google-auth.ts
import { OAuth2Client } from "google-auth-library";

// Variável para guardar o cliente OAuth e evitar recriá-lo a cada chamada
let oauth2Client: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!oauth2Client) {
    // Cria o cliente OAuth com as credenciais do seu app
    oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CALENDAR_RESERVATION_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_RESERVATION_SECRET,
      "https://developers.google.com/oauthplayground" // O mesmo redirect URI usado no Playground
    );
  }

  // Define a "chave mestra" (refresh token) no cliente
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

export async function getGoogleAuthToken(): Promise<string> {
  const client = getOAuthClient();

  try {
    // Pede um novo token de acesso usando a "chave mestra"
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Falha ao obter o token de acesso do Google com o refresh token.");
    }

    return accessToken.token;
  } catch (error) {
    console.error("Erro ao renovar o token de acesso:", error);
    throw new Error("Não foi possível autenticar com o Google. Verifique as credenciais e o refresh token.");
  }
}