import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
   try {
      const authUser = await getAuthenticatedUser(); 
      if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { memberIds } = await req.json();
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
         return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const allMemberIds = Array.from(new Set([authUser.id, ...memberIds]));

      const memberExists = await prisma.user.findMany({
         where: { id: { in: allMemberIds } },
         select: { id: true },
      });

      if (memberExists.length !== allMemberIds.length) {
         return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const conversation = await prisma.directConversation.create({
         data: {
            participants: {
               connect: allMemberIds.map((id) => ({ id })),
            },
            createdById: authUser.id,
         },
      });
      revalidatePath('/comunidade/conversas')
      return NextResponse.json(conversation, { status: 201 });

   } catch (error) {
      console.error(error)
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
   }
}