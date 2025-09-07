import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { s3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { OraculoAreas } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const formData = await request.formData();
    const type = formData.get("type") as "folder" | "file";
    const rawParentId = formData.get("parentId");
    const parentId =
      rawParentId && rawParentId !== "null" && rawParentId !== "root"
        ? String(rawParentId)
        : null;
    const restrictedToAreas = formData.getAll(
      "restrictedToAreas"
    ) as OraculoAreas[];
    
    if (type === "folder") {
      const name = formData.get("name") as string;
      await prisma.oraculoFolder.create({
        data: {
          name,
          parentId: parentId || null,
          ownerId: authUser.id,
          restrictedToAreas,
        },
      });
    } else if (type === "file") {
      const files = formData.getAll("files") as File[];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `${parentId || "root"}/${authUser.id}/-${file.name}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.ORACULO_S3_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          })
        );
        await prisma.oraculoFile.create({
          data: {
            name: file.name,
            key: key,
            fileType: file.type,
            size: file.size,
            ownerId: authUser.id,
            folderId: parentId && parentId !== "null" ? parentId : null,
            restrictedToAreas,
          },
        });
      }
    }
    revalidatePath("/oraculo");
    return NextResponse.json(
      { message: "Item(s) criado(s) com sucesso!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar item no Oráculo:", error);
    return NextResponse.json(
      { message: "Erro ao criar item." },
      { status: 500 }
    );
  }
}
