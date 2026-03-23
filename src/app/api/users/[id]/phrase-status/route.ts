import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(); // Replace with actual auth logic
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (id !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { phraseStatus } = await request.json();
    if (typeof phraseStatus !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { phraseStatus },
    });
    revalidatePath('/comunidade')
    revalidatePath('/comunidade/feed')
    return NextResponse.json(
      { message: "Phrase status updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to update phrase status" },
      { status: 500 }
    );
  }
}
