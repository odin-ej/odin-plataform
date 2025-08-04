import { s3Client } from "@/lib/aws";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { linkPostersUpdateSchema } from "@/lib/schemas/linkPostersSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = linkPostersUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isActive, image, ...validatedData } = validation.data;

    const updatedPoster = await prisma.linkPoster.update({
      where: { id: validatedData.id },
      data: {
        ...validatedData,
        isActive: isActive === "Sim",
      },
    });
    revalidatePath("/gerenciar-link-posters");
    revalidatePath("/");
    return NextResponse.json(updatedPoster);
  } catch (error) {
    console.error("Erro ao atualizar poster com link:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar poster com link." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = linkPostersUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos." },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    if (validatedData.imageUrl) {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: validatedData.imageUrl,
      });
      await s3Client.send(command);
    }

    const deletedPoster = await prisma.linkPoster.delete({
      where: { id: validatedData.id },
    });
    revalidatePath("/gerenciar-link-posters");
    revalidatePath("/");
    return NextResponse.json(deletedPoster);
  } catch (error) {
    console.error("Erro ao deletar poster com link:", error);
    return NextResponse.json(
      { message: "Erro ao deletar poster com link." },
      { status: 500 }
    );
  }
}
