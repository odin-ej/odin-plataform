/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { prisma } from "@/db"; // Supondo que o seu singleton do Prisma está aqui
import { z } from "zod";
import bcrypt from "bcrypt";
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "@/lib/aws";

// Schema de validação Zod para a criação de um utilizador (ex: por um admin)
const userCreateSchema = z.object({
  name: z.string().min(3, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  emailEJ: z.string().email("E-mail EJ inválido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  birthDate: z.string().datetime("Formato de data inválido."),
  phone: z.string().min(10, "Telefone inválido."),
  course: z.string().min(3, "O curso é obrigatório."),
  semesterEntryEj: z.string().min(6, "Formato inválido (ex: 2024.1)."),
  semesterLeaveEj: z.string().min(6, "Formato inválido.").optional().nullable(),
  linkedin: z.string().url("Insira um link válido.").optional().nullable(),
  instagram: z.string().url("Insira um link válido.").optional().nullable(),
  about: z.string().optional().nullable(),
  aboutEj: z.string().optional().nullable(),
  imageUrl: z.string().min(3, "A URL da imagem é obrigatória."),
  roleIds: z.array(z.string()).optional(),
  isExMember: z.boolean().optional(),

  // ... adicione outras validações conforme necessário
});

// --- FUNÇÃO GET: Listar todos os utilizadores ---
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      // Inclui a relação com os cargos para poder exibi-los
      include: {
        roles: true,
        currentRole: true,
        roleHistory: { include: { role: { select: {name: true}} } },
        professionalInterests: { include: {
          category: true
        }},

      },
      orderBy: {
        createdAt: "desc",
      },
    });
    // Remove a senha de todos os utilizadores antes de enviar a resposta
    const usersWithoutPassword = users.map((user: (typeof users)[number]) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }); //id do Admin do banco de produção
    return NextResponse.json({ users: usersWithoutPassword });
  } catch (error) {
    console.error("Erro ao buscar utilizadores:", error);
    return NextResponse.json(
      { message: "Erro ao buscar utilizadores." },
      { status: 500 }
    );
  }
}
