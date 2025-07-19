"use client";
import { Megaphone, Plus } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { User, Role, ReportStatus } from ".prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ExtendedReport,
  ReportFormValues,
  reportSchema,
} from "@/lib/schemas/reportSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import ReportFormModal from "./ReportFormModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";

interface ReportsContentProps {
  myReports: ExtendedReport[];
  reportsForMe: ExtendedReport[];
  // Props adicionais para popular os selects do modal
  allUsers: User[];
  allRoles: Role[];
}

const ReportsContent = ({
  myReports,
  reportsForMe,
  allUsers,
}: ReportsContentProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [idReport, setIdReport] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMyReports, setIsMyReports] = useState(false);
  const router = useRouter();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  // Função para abrir o modal de criação
  const handleActionClick = () => {
    form.reset({
      title: "",
      content: "",
      recipientRoleId: undefined,
      recipientUserId: undefined,
    });
    setIsCreateModalOpen(true);
  };

  const handleRowClick = (report: ExtendedReport, table: string) => {

    form.reset({
      title: report.title ?? "",
      content: report.content ?? "",
      recipientNotes: report.recipientNotes ?? "",
      status: report.status ?? undefined,
      recipientRoleId: report.recipientRoleId ?? undefined,
      recipientUserId: report.recipientUserId ?? undefined,
    });
    setIsMyReports(table === "myReports" ? true : false);
    if (table === "myReports") setIsEditing(false);
    setIdReport(report.id);
    setIsViewModalOpen(true);
  };

  // Função para submeter o novo report
  const handleCreateSubmit = async (data: ReportFormValues) => {
    try {
      setIsLoading(true);
      // Lógica para chamar a API POST /api/reports
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao criar o report.");
      }
      toast.success("Report enviado com sucesso!");
      setIsCreateModalOpen(false);
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleUpdateSubmit = async (data: ReportFormValues) => {
    try {
      setIsLoading(true);
      // Lógica para chamar a API POST /api/reports
      const response = await fetch(`/api/reports/${idReport}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: data.status,
          recipientNotes: data.recipientNotes,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao criar o report.");
      }
      toast.success("Report atualizado com sucesso!");
      setIsCreateModalOpen(false);
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false);
  };

  const reportsColumns: ColumnDef<ExtendedReport>[] = [
    {
      accessorKey: "title",
      header: "Título",
    },
    {
      accessorKey: "recipientUser",
      header: "Destinatário",
      cell: (row) => {
        return (
          row.recipientUser?.name ||
          row.recipientRole?.name ||
          "Não especificado"
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={cn("px-2 py-1 rounded-full text-xs font-semibold", {
            "bg-yellow-500/20 text-yellow-400":
              row.status === ReportStatus.DRAFT ||
              row.status === ReportStatus.SUBMITTED,
            "bg-green-500/20 text-green-400":
              row.status === ReportStatus.APPROVED,
            "bg-red-500/20 text-red-400": row.status === ReportStatus.REVIEWED, // Supondo que REVIEWED seja um estado de "rejeitado"
          })}
        >
          {row.status === ReportStatus.DRAFT
            ? "Rascunho"
            : row.status === "SUBMITTED"
            ? "Em análise"
            : row.status === "APPROVED"
            ? "Aprovado"
            : "Recusado"}
        </span>
      ),
    },
  ];

  const reportFields: FieldConfig<ReportFormValues>[] = [
    {
      header: "Título",
      accessorKey: "title",
      type: "text",
    },
    {
      header: "Conteúdo",
      accessorKey: "content",
      type: "text",
    },
    {
      header: "Status",
      accessorKey: "status",
      type: "select",
      options: [
        { value: "SUBMITTED", label: "Em análise" },
        { value: "APPROVED", label: "Aprovado" },
        { value: "REJECTED", label: "Recusado" },
        { value: "DRAFT", label: "Rascunho" },
      ],
    },
    {
      header: "Destinatário (Usuário)",
      accessorKey: "recipientUserId",
      type: "select",
      options: allUsers.map((user) => ({
        value: user.id,
        label: user.name,
      })),
    },
    {
      header: 'Notas do "Destinatário"',
      accessorKey: "recipientNotes",
      type: "text",
    },
  ];

  const editReportFields: FieldConfig<ReportFormValues>[] = [
    {
      header: 'Notas do "Destinatário"',
      accessorKey: "recipientNotes",
      type: "text",
    },
    {
      header: "Status",
      accessorKey: "status",
      type: "select",
      options: [
        { value: "SUBMITTED", label: "Em análise" },
        { value: "APPROVED", label: "Aprovado" },
        { value: "REJECTED", label: "Recusado" },
        { value: "DRAFT", label: "Rascunho" },
      ],
    },
  ];

  return (
    <>
      <CustomCard
        icon={Megaphone}
        value={0}
        type="introduction"
        title="Reports"
        description="Aqui você pode registrar e comunicar possíveis problemas no ambiente de trabalho."
      />
      {/* Botão de Ação para abrir o modal de criação */}
      <div className="grid grid-cols-2 gap-4 place-items-center pt-8">
        <div className="col-span-2 lg:col-span-1 place-items-center">
          <h2 className="text-2xl text-center mb-2 font-bold text-[#f5b719]">
            Regras de Utilização
          </h2>

          <p className="text-white font-semibold text-justify mb-4">
            Esta seção possui o objetivo de facilitar{" "}
            <span className="font-bold text-[#f5b719]">
              o registro e a comunicação de possíveis problemas
            </span>{" "}
            que podem estar ocorrendo no ambiente de trabalho da nossa
            casinhaonhos. Por isso, esteja ciente destas{" "}
            <span className="font-bold text-[#f5b719]">restrições</span>:
          </p>

          <ol className="list-decimal list-inside max-w-[80%] mx-auto text-white font-sm space-y-2">
            <li>
              Enviar uma vez é o suficiente, com paciência, seu problema será
              resolvido!
            </li>

            <li>
              Não envie reports falsos, com conteúdo pejorativo ou ofensivo
            </li>

            <li>
              Não utilize este canal para discriminação de outros membros,
              mantenha o profissionalismo!
            </li>
          </ol>
        </div>
        <div className="col-span-2 lg:col-span-1 place-items-center">
          <div>
            <h2 className="text-xl text-center font-bold text-[#f5b719] mb-4">
              Observações
            </h2>
            <ul className="list-disc list-inside space-y-2 max-w-[80%] mx-auto text-white text-sm">
              <li>
                Após enviar, não será possível editar nem excluir um report.
              </li>

              <li>
                Preencha as informações com cuidado, e certifique-se de escolher
                o responsável certo.
              </li>

              <li>
                Caso haja algum erro, envie <b>somente um outro report</b>{" "}
                explicando a situação.
              </li>
            </ul>
          </div>

          <div className="mt-4 place-items-center">
            <h2 className="text-xl text-center md:text-left font-bold text-[#f5b719] mb-4">
              Legenda
            </h2>

            <ul className="space-y-2 max-w-[80%] mx-auto text-white text-sm">
              <li>
                <b className="text-red-500">Recusado</b> - Report infringiu
                alguma regra, verifique as notas deixadas pelos responsável.
              </li>

              <li>
                <b className="text-[#f5b719]">Em análise</b> - Report ainda em
                análise, aguarde.
              </li>

              <li>
                <b className="text-green-500">Concluído</b> - Report concluído,
                verifique as notas deixadas pelos responsável.
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleActionClick}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Novo Report
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
        <CustomTable<ExtendedReport>
          type="onlyView"
          title="Meus Reports Enviados"
          columns={reportsColumns}
          data={myReports}
          onRowClick={(row) => handleRowClick(row, "myReports")}
          filterColumns={["title", "recipientUser", "status"]}
        />
        <CustomTable<ExtendedReport>
          title="Reports para Mim"
          type="onlyView"
          columns={reportsColumns}
          onRowClick={(row) => handleRowClick(row, "reportsForMe")}
          filterColumns={["title", "recipientUser", "status"]}
          data={reportsForMe}
        />
      </div>
      <ReportFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        form={form}
        isLoading={isLoading}
        onSubmit={handleCreateSubmit}
        users={allUsers.map((u) => ({ value: u.id, label: u.name }))}
      />
      <CustomModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={isEditing ? "Resolver Report" : "Visualizar Report"}
        form={form}
        onSubmit={handleUpdateSubmit}
        fields={isEditing ? editReportFields : reportFields}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isLoading={isLoading}
        onlyView={isMyReports}
      />
    </>
  );
};

export default ReportsContent;
