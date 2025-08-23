// app/api/enterprise-points/history/route.ts

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
    });

    if (!activeSemester) {
      return NextResponse.json({ tags: [], solicitations: [], reports: [] });
    }

    // Fetches all enterprise tags within the ACTIVE SEMESTER.
    const tags = await prisma.tag.findMany({
      where: {
        enterprisePointsId: 1, // Assumes enterprise ID is 1
        enterpriseSemesterScore: { semesterPeriodId: activeSemester.id },
      },
      include: {
        assigner: true,
        actionType: true,
        jrPointsVersion: true,
        template:true
      },
      orderBy: { datePerformed: "desc" },
    });

    // Fetches all solicitations made for the enterprise.
    const solicitations = await prisma.jRPointsSolicitation.findMany({
      where: { isForEnterprise: true, enterpriseSemesterScore: { semesterPeriodId: activeSemester.id } },
      include: {
        user: { select: { id: true, name: true, imageUrl: true, email: true } },
        attachments: true,
        membersSelected: true,
        tags: true,
        reviewer:true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetches all reports made for the enterprise.
    const reports = await prisma.jRPointsReport.findMany({
      where: { isForEnterprise: true, enterpriseSemesterScore: { semesterPeriodId: activeSemester.id } },
      include: {
        user: { select: { id: true, name: true, imageUrl: true, email: true } },
        tag: { include: { assigner: true, actionType: true } },
        attachments: true,
         reviewer:true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tags, solicitations, reports });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao buscar histórico da empresa:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor.", error: error.message },
      { status: 500 }
    );
  }
}
