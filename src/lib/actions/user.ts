// lib/actions/user.ts
"use server"

import { prisma } from "@/db";


export async function updateHeartbeat(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() }
  });
}

// lib/utils.ts
