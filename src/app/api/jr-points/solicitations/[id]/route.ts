import { prisma } from "@/db";
import { s3Client } from "@/lib/aws";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const solicitationEditSchema = z.object({
  description: z.string().min(1),
  datePerformed: z.string(), // ou z.coerce.date() se quiser forçar Date
  membersSelected: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .optional(), // Ou um objeto se precisar mais info
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = solicitationEditSchema.safeParse(body);

    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return new NextResponse("Dados inválidos", { status: 400 });
    }

    const solicitation = await prisma.jRPointsSolicitation.findUnique({
      where: { id },
      include: { user: true, attachments: true },
    });

    if (!solicitation) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    // Verifica se quem está tentando editar é o dono da solicitação
    if (solicitation.userId !== authUser.id) {
      return new NextResponse(
        "Você não tem permissão para editar esta solicitação.",
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Lógica de Sincronização de Anexos (que já está funcionando bem)
      const finalUrls = validation.data.attachments?.map((a) => a.url) ?? [];
      const attachmentsToDelete = solicitation.attachments.filter(
        (a) => !finalUrls.includes(a.url)
      );
      if (attachmentsToDelete.length > 0) {
        const deletePromises = attachmentsToDelete.map((file) => {
          const s3Key = file.url;
          return s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!,
              Key: s3Key,
            })
          );
        });
        await Promise.all(deletePromises);
      }

      const performedDateObject = fromZonedTime(
        validation.data.datePerformed,
        "America/Sao_Paulo"
      );
      if (isNaN(performedDateObject.getTime())) {
        return NextResponse.json(
          { message: "A data deve estar no formato AAAA-MM-DD." },
          { status: 400 }
        );
      }

      const attachmentsToCreate =
        validation.data.attachments?.filter(
          (a) => !solicitation.attachments.some((oa) => oa.url === a.url)
        ) ?? [];

      // ATUALIZAÇÃO CONSOLIDADA E CORRIGIDA
      await tx.jRPointsSolicitation.update({
        where: { id },
        data: {
          description: validation.data.description,
          datePerformed: performedDateObject, // Agora é um objeto Date, tratado corretamente pelo Prisma

          // CORREÇÃO 1: Tratar campos opcionais explicitamente
          // Se 'membersSelected' não for enviado, define a relação como vazia.
          membersSelected: {
            set: (validation.data.membersSelected || []).map((userId) => ({
              id: userId,
            })),
          },
          // O mesmo para 'tags'
          tags: {
            set: (validation.data.tags || []).map((tagId) => ({ id: tagId })),
          },
          attachments: {
            deleteMany: { id: { in: attachmentsToDelete.map((a) => a.id) } },
            create: attachmentsToCreate.map((file) => ({
              url: file.url,
              fileName: file.fileName,
              fileType: file.fileType,
            })),
          },
        },
      });
    });
    revalidatePath("/meus-pontos");
    revalidatePath("/gerenciar-jr-points");
    return NextResponse.json({
      message: "Solicitação atualizada com sucesso!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erro Interno do Servidor";
    return new NextResponse(errorMessage, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Passo 1: Buscar a solicitação E seus anexos antes de deletar
    const solicitationToDelete = await prisma.jRPointsSolicitation.findUnique({
      where: { id },
      include: {
        attachments: true, // Inclui a lista de anexos associados
      },
    });

    if (!solicitationToDelete) {
      return NextResponse.json(
        { message: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Passo 2: Se existirem anexos, deletá-los do bucket S3
      if (
        solicitationToDelete.attachments &&
        solicitationToDelete.attachments.length > 0
      ) {
        const deletePromises = solicitationToDelete.attachments.map((file) => {
          // Extrai a "chave" (caminho do arquivo) a partir da URL completa
          const s3Key = file.url;

          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.JRPOINTS_S3_BUCKET_NAME!,
            Key: s3Key,
          });

          return s3Client.send(deleteCommand);
        });

        // Executa todas as promessas de deleção em paralelo
        await Promise.all(deletePromises);
      }

      // Passo 3: Deletar o registro da solicitação do banco de dados
      // O Prisma cuidará de deletar os registros 'FileAttachment' em cascata.
      await tx.jRPointsSolicitation.delete({
        where: { id },
      });
    });

    // Invalida o cache das páginas para que a lista seja atualizada
    revalidatePath("/meus-pontos");
    revalidatePath("/gerenciar-jr-points");

    // Retorna uma resposta de sucesso sem conteúdo, que é a melhor prática para DELETE
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao apagar solicitação:", error);
    return NextResponse.json(
      { message: "Erro ao apagar solicitação." },
      { status: 500 }
    );
  }
}
