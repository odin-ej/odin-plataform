"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import CustomCard from "../Global/Custom/CustomCard";
import { Award, Loader2 } from "lucide-react";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { TagWithAction } from "@/lib/schemas/pointsSchema";
import Image from "next/image";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";
import { MyPointsData } from "@/app/(dashboard)/meus-pontos/page"; // Importa a tipagem

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Função que o TanStack Query usará para re-buscar os dados no cliente
const fetchMyPoints = async (userId: string): Promise<MyPointsData> => {
    const { data } = await axios.get(`${API_URL}/my-points/${userId}`);
    return data;
};

const MyPointsContent = ({ initialData }: { initialData: MyPointsData }) => {
  const { user } = useAuth();
  const userId = user?.id;

  // --- QUERY PRINCIPAL (Gerencia os dados da página) ---
  const { data, isLoading, isError } = useQuery({
    // A chave da query inclui o ID do usuário para ser única
    queryKey: ['myPoints', userId],
    queryFn: () => fetchMyPoints(userId!),
    initialData: initialData,
    // A query só será executada no cliente se o userId estiver disponível
    enabled: !!userId,
  });

  // --- ESTADOS DE CARREGAMENTO E ERRO ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  if (isError || !data?.myPoints) {
    return <div className="p-8 text-white text-center">Erro ao carregar seus pontos.</div>;
  }
  
  // Usamos os dados do 'data' do useQuery como fonte da verdade
  const { myPoints } = data;

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
            Olá, {user?.name.split(" ")[0]}!
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