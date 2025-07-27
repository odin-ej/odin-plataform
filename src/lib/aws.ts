import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";

const awsClientConfig = {
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
};

// Inicializa todos os clientes com a mesma configuração explícita
export const cognitoClient = new CognitoIdentityProviderClient(awsClientConfig);
export const s3Client = new S3Client(awsClientConfig);
export const sesClient = new SESClient(awsClientConfig);