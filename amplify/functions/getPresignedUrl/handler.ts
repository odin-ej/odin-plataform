/* eslint-disable @typescript-eslint/no-explicit-any */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "../shared/utils";
import crypto from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.REGION });
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body)
      return createResponse(400, { message: "Corpo da requisição ausente." });
    const { fileType, fileSize } = JSON.parse(event.body);

    if (!fileType || !fileSize)
      return createResponse(400, {
        message: "Tipo ou tamanho do ficheiro em falta.",
      });
    if (fileSize > 1024 * 1024 * 5)
      return createResponse(400, {
        message: "O ficheiro é demasiado grande (máx 5MB).",
      });

    const key = `${generateFileName()}.${fileType.split("/")[1]}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    return createResponse(200, { url, key });
  } catch (error: any) {
    return createResponse(500, {
      message: "Falha ao gerar URL para upload.",
      error: error.message,
    });
  }
};
