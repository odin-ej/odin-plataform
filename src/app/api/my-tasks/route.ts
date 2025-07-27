import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(){
   try {
      const authUser = await getAuthenticatedUser();
   
      if (!authUser) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
      }

      const tasks = await prisma.task.findMany({
        where: {
         responsibles: {
          some: {
           id: authUser.id
         }
        },
        status: "PENDING",        
      },
        include: {
         responsibles: true,
        },
        orderBy: {
         deadline: "asc",
        },
      });

      

      return NextResponse.json(tasks);
     } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      return NextResponse.json(
        { message: "Erro ao buscar tarefas.", error },
        { status: 500 }
      );
     }
}