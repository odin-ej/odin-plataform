import { prisma } from "@/db";
import { s3Client } from "@/lib/aws";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }
  const {id} = await params
  try {
    const reportToDelete = await prisma.jRPointsReport.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!reportToDelete || reportToDelete.userId !== authUser.id) {
      return NextResponse.json({ message: "Recurso não encontrado ou sem permissão." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deleta os arquivos do S3 se existirem
      if (reportToDelete.attachments.length > 0) {
        const deletePromises = reportToDelete.attachments.map(file => {
          const s3Key = file.url.split(`${process.env.JRPOINTS_S3_BUCKET_NAME}.s3.amazonaws.com/`)[1];
          return s3Client.send(new DeleteObjectCommand({ Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!, Key: s3Key }));
        });
        await Promise.all(deletePromises);
      }

      // 2. Deleta o registro do banco
      await tx.jRPointsReport.delete({ where: { id } });
    });

    revalidatePath('/meus-pontos');
    revalidatePath('/gerenciar-jr-points');
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("Erro ao apagar recurso:", error);
    return NextResponse.json({ message: "Erro ao apagar recurso." }, { status: 500 });
  }
}
