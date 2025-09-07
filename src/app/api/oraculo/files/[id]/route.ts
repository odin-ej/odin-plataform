import { prisma } from "@/db";
import { s3Client } from "@/lib/aws";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const { newName, restrictedToAreas } = await request.json();
    const fileToRename = await prisma.oraculoFile.findUnique({
      where: { id: id },
    });
    if (!fileToRename)
      return NextResponse.json(
        { message: "Arquivo não encontrado." },
        { status: 404 }
      );
    const isOwner = fileToRename.ownerId === authUser.id;
    if (!isOwner && !checkUserPermission(authUser, DIRECTORS_ONLY))
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });

    const bucket = process.env.ORACULO_S3_BUCKET_NAME!;
    const oldKey = fileToRename.key;
    const parts = fileToRename.key.split("/");
    const parentId = parts[0]; // root
    const ownerId = parts[1]; // 123
    // ignoramos o timestamp pra não gerar duplicado
    const extension = fileToRename.name.split(".").pop();
    const newKey = `${parentId}/${ownerId}/${newName}.${extension}`;

    // Copia o arquivo para a nova key
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${oldKey}`, // formato BUCKET/KEY
        Key: newKey,
        ContentType: fileToRename.fileType,
        MetadataDirective: "REPLACE",
      })
    );

    // Deleta o antigo
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: oldKey,
      })
    );

    // Atualiza no banco
    await prisma.oraculoFile.update({
      where: { id },
      data: {
        name: newName,
        key: newKey, // precisa salvar a nova key também
        restrictedToAreas
      },
    });
    revalidatePath("/oraculo");
    return NextResponse.json({ message: "Arquivo renomeado com sucesso!" });
  } catch (error) {
    console.error("Erro ao renomear arquivo do Oráculo:", error);
    return NextResponse.json(
      { message: "Erro ao renomear arquivo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const fileToDelete = await prisma.oraculoFile.findUnique({
      where: { id: id },
    });
    if (!fileToDelete)
      return NextResponse.json(
        { message: "Arquivo não encontrado." },
        { status: 404 }
      );

    const isOwner = fileToDelete.ownerId === authUser.id;
    if (!isOwner && !checkUserPermission(authUser, DIRECTORS_ONLY))
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.ORACULO_S3_BUCKET_NAME!,
        Key: fileToDelete.key,
      })
    );
    await prisma.oraculoFile.delete({ where: { id: id } });
revalidatePath("/oraculo");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao deletar arquivo do Oráculo:", error);
    return NextResponse.json(
      { message: "Erro ao deletar arquivo." },
      { status: 500 }
    );
  }
}
