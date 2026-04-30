/**
 * Script idempotente para preparar o banco para o Fecs Week Game.
 *
 * Proposito:
 *   1. Garante a existencia do Semester "2026.1" (cria se nao existir).
 *   2. Cria um snapshot dos pontos atuais (UserPoints + EnterprisePoints) e
 *      os armazena como UserSemesterScore + EnterpriseSemesterScore vinculados
 *      ao semestre "2026.1".
 *   3. ZERA as pontuacoes atuais (UserPoints.totalPoints e
 *      EnterprisePoints.value) — para iniciar o novo game do zero.
 *   4. Marca "2026.1" como `isActive: true` e desativa demais semestres.
 *
 * Como rodar:
 *   - Local: `npx ts-node prisma/snapshot-fecs-week.ts`
 *   - Producao/Staging: `DATABASE_URL="postgres://..." npx ts-node prisma/snapshot-fecs-week.ts`
 *
 * Seguro?
 *   - Idempotente quanto ao Semester (upsert por name).
 *   - Idempotente quanto ao snapshot: se ja existe um snapshot para o
 *     semestre 2026.1, ABORTA antes de zerar (evita perder dados).
 *   - Toda a operacao roda em uma transacao.
 *
 * IMPORTANTE:
 *   Apos rodar este script, lembre-se de:
 *   1. Em /gerenciar-permissoes, remapear as actions
 *      `Aprovar Solicitacoes JR Points` e (opcional)
 *      `Gerenciar Configuracoes de JR Points` para a policy
 *      `Aprovadores Fecs Week`.
 *   2. (Opcional) Em /fecs-week-game/gerenciar > Versoes, criar e ativar
 *      uma JRPointsVersion "Fecs Week Game" para isolar tags/templates do
 *      evento.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

/** Configuracao do semestre alvo. Ajuste aqui se precisar mudar datas. */
const SEMESTER_CONFIG = {
  name: "2026.1",
  // Datas em America/Sao_Paulo. Ajuste conforme o periodo real do evento.
  startDate: "2026-04-01",
  endDate: "2026-09-30",
};

async function main() {
  console.log("🎮 Preparando banco para Fecs Week Game...");
  console.log(`   Semestre alvo: ${SEMESTER_CONFIG.name}`);

  // 1. Garante o Semester "2026.1"
  const startDate = fromZonedTime(SEMESTER_CONFIG.startDate, "America/Sao_Paulo");
  const endDate = fromZonedTime(SEMESTER_CONFIG.endDate, "America/Sao_Paulo");

  const semester = await prisma.semester.upsert({
    where: { name: SEMESTER_CONFIG.name },
    update: { startDate, endDate },
    create: {
      name: SEMESTER_CONFIG.name,
      startDate,
      endDate,
      isActive: false,
    },
  });
  console.log(`  ✅ Semester "${semester.name}" garantido (id: ${semester.id})`);

  // 2. Verifica se ja existe snapshot para este semestre
  const existingSnapshot = await prisma.enterpriseSemesterScore.findUnique({
    where: { semesterPeriodId: semester.id },
  });
  if (existingSnapshot) {
    console.log(
      `  ⚠️  Ja existe um snapshot para o semestre "${semester.name}". Abortando para nao sobrescrever dados.`
    );
    console.log(
      "      Se voce quer recomecar, delete manualmente os UserSemesterScore/EnterpriseSemesterScore desse semestre antes."
    );
    return;
  }

  // 3. Coleta pontuacoes atuais
  const usersWithPoints = await prisma.user.findMany({
    where: { points: { isNot: null } },
    include: { points: true },
  });
  const enterprisePoints = await prisma.enterprisePoints.findUnique({
    where: { id: 1 },
  });
  console.log(
    `  ℹ️  ${usersWithPoints.length} usuarios com pontos. EnterprisePoints atual: ${enterprisePoints?.value ?? 0}`
  );

  // 4. Salva snapshot + zera tudo + ativa semester (em uma transacao)
  await prisma.$transaction(async (tx) => {
    // 4a. Snapshot dos usuarios
    if (usersWithPoints.length > 0) {
      await Promise.all(
        usersWithPoints.map((user) =>
          tx.userSemesterScore.upsert({
            where: {
              userId_semesterPeriodId: {
                userId: user.id,
                semesterPeriodId: semester.id,
              },
            },
            update: { totalPoints: user.points!.totalPoints },
            create: {
              userId: user.id,
              semester: semester.name,
              totalPoints: user.points!.totalPoints,
              semesterPeriodId: semester.id,
            },
          })
        )
      );
    }

    // 4b. Snapshot da empresa
    if (enterprisePoints) {
      await tx.enterpriseSemesterScore.upsert({
        where: { semesterPeriodId: semester.id },
        update: { value: enterprisePoints.value },
        create: {
          semester: semester.name,
          value: enterprisePoints.value,
          semesterPeriodId: semester.id,
        },
      });
    }

    // 4c. Zera UserPoints
    if (usersWithPoints.length > 0) {
      await tx.userPoints.updateMany({
        where: { id: { in: usersWithPoints.map((u) => u.points!.id) } },
        data: { totalPoints: 0 },
      });
    }

    // 4d. Zera EnterprisePoints
    if (enterprisePoints) {
      await tx.enterprisePoints.update({
        where: { id: 1 },
        data: { value: 0 },
      });
    }

    // 4e. Ativa o semestre 2026.1 e desativa os demais
    await tx.semester.updateMany({
      where: { id: { not: semester.id } },
      data: { isActive: false },
    });
    await tx.semester.update({
      where: { id: semester.id },
      data: { isActive: true },
    });
  });

  console.log(`  ✅ Snapshot salvo no semestre "${semester.name}".`);
  console.log("  ✅ UserPoints e EnterprisePoints ZERADOS.");
  console.log(`  ✅ Semestre "${semester.name}" ativado.`);
  console.log("");
  console.log("🎮 Pronto! O Fecs Week Game pode comecar.");
  console.log("   Proximo passo (UI): /gerenciar-permissoes -> remapear");
  console.log("   actions de JR Points para policy 'Aprovadores Fecs Week'.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
