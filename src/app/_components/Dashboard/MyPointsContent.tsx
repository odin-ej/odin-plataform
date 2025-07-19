"use client";
import { UserPoints } from ".prisma/client";
import CustomCard from "../Global/Custom/CustomCard";
import { Award } from "lucide-react";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { TagWithAction } from "@/lib/schemas/pointsSchema";
import Image from "next/image";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";

interface MyPointsContentProps {
  myPoints: UserPoints & { tags: TagWithAction[] };
}

const MyPointsContent = ({ myPoints }: MyPointsContentProps) => {
  const { user } = useAuth();
  if (!user) return null;
  const tagColumns: ColumnDef<TagWithAction>[] = [
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },
    { accessorKey: "value", header: "Pontos", className: "text-right" },
  ];

  return (
    <>
      <CustomCard
        type="link"
        icon={Award}
        title="Meus Pontos"
        value={myPoints.totalPoints as number}
      />
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative mt-4 p-6 rounded-lg">
        <div className="flex-1 text-white">
          <h2 className="text-3xl font-bold mb-4 text-[#0126fb]">
            Olá, {user.name.split(" ")[0]}!
          </h2>
          <p className="text-lg mb-3 leading-relaxed">
            Esta seção pode parecer simples, mas permite que você tenha plena
            noção de seus pontos -{" "}
            <strong className="text-[#f5b719]">TRANSPARÊNCIA</strong>.
          </p>
          <p className="text-lg leading-relaxed">
            É sempre importante que você verifique se seus pontos foram
            distribuídos corretamente. E, caso discorde de alguma coisa,{" "}
            <Link
              href="/reports"
              className="text-[#0126fb] font-bold underline"
            >
              {" "}
              faça um report
            </Link>{" "}
            sobre para a Diretoria!
          </p>
        </div>
        <div className="flex-shrink-0 w-full md:w-1/3 max-w-[250px] md:max-w-xs relative h-48 md:h-64">
          <Image
            src="/transparencia.png"
            alt="Transparency"
            fill
            className="object-contain"
          />
        </div>
      </div>
      <div className="mt-4">
        <CustomTable
          columns={tagColumns}
          data={myPoints.tags}
          filterColumns={["value", "datePerformed", "description"]}
          title="Minhas Tags"
          type="onlyView"
          itemsPerPage={10}
        />
      </div>
    </>
  );
};

export default MyPointsContent;
