import { prisma } from "@/db";
import { s3Client } from "@/lib/aws";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
// ... (imports)

// Função recursiva para deletar arquivos de uma pasta e suas subpastas do S3
async function deleteFolderContentsS3(folderId: string) {
  const folder = await prisma.oraculoFolder.findUnique({
    where: { id: folderId },
    include: { files: true, children: true },
  });
  if (!folder) return;

  // Deleta arquivos da pasta atual
  const fileDeletePromises = folder.files.map((file) =>
    s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.ORACULO_S3_BUCKET_NAME!,
        Key: file.key,
      })
    )
  );
  await Promise.all(fileDeletePromises);

  // Chama recursivamente para as subpastas
  const childFolderPromises = folder.children.map((child) =>
    deleteFolderContentsS3(child.id)
  );
  await Promise.all(childFolderPromises);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const body = await request.json();
    const { name, restrictedToAreas } = body;
    const folderToRename = await prisma.oraculoFolder.findUnique({
      where: { id: id },
      include: { owner: true },
    });
    if (!folderToRename)
      return NextResponse.json(
        { message: "Pasta não encontrada." },
        { status: 404 }
      );

    const isOwner = folderToRename.ownerId === authUser.id;
    if (!isOwner && !checkUserPermission(authUser, DIRECTORS_ONLY))
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });

    await prisma.oraculoFolder.update({
      where: { id },
      data: { name, restrictedToAreas },
    });
    revalidatePath("/oraculo");
    return NextResponse.json({ message: "Pasta renomeada com sucesso!" });
  } catch (error) {
    console.error("Erro ao renomear pasta:", error);
    return NextResponse.json(
      { message: "Erro ao renomear pasta." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Primeiro, deleta todos os arquivos contidos na pasta e subpastas do S3
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const folderToDelete = await prisma.oraculoFolder.findUnique({
      where: { id },
      include: { owner: true },
    });
    if (!folderToDelete)
      return NextResponse.json(
        { message: "Pasta não encontrada." },
        { status: 404 }
      );
    const isOwner = folderToDelete.ownerId === authUser.id;
    if (!isOwner && !checkUserPermission(authUser, DIRECTORS_ONLY))
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    await deleteFolderContentsS3(id);
    // Depois, deleta o registro da pasta no Prisma. O 'onDelete: Cascade' cuidará do resto.
    revalidatePath("/oraculo");
    await prisma.oraculoFolder.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao deletar pasta do Oráculo:", error);
    return NextResponse.json(
      { message: "Erro ao deletar pasta." },
      { status: 500 }
    );
  }
}
