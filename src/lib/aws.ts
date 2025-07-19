import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const sesClient = new SESClient({
  region: process.env.AWS_REGION,
});