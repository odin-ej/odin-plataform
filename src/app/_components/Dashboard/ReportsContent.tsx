/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Loader2, Megaphone, Plus } from "lucide-react";
import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { ReportStatus } from "@prisma/client";
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
import { cn } from "@/lib/utils";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ReportsPageData } from "@/app/(dashboard)/reports/page";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ReportsContent = ({ initialData }: { initialData: ReportsPageData }) => {
  const queryClient = useQueryClient();

  // --- UI State (remains) ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExtendedReport | null>(
    null
  );
  const [isMyReports, setIsMyReports] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  // Função para abrir o modal de criação
  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["reportsData"],
    queryFn: async (): Promise<ReportsPageData> => {
      const [reportsRes, usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/reports`),
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/roles`),
      ]);
      return {
        myReports: reportsRes.data.myReports,
        reportsForMe: reportsRes.data.reportsForMe,
        allUsers: usersRes.data.users,
        allRoles: rolesRes.data,
      };
    },
    initialData: initialData,
  });

  // --- MUTATIONS ---

  // 1. Create a new report
  const { mutate: createReport, isPending: isCreating } = useMutation({
    mutationFn: (reportData: ReportFormValues) =>
      axios.post(`${API_URL}/api/reports`, reportData),
    onSuccess: () => {
      toast.success("Report enviado com sucesso!");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reportsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao criar report", {
        description: error.response?.data?.message,
      }),
  });

  // 2. Update an existing report
  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: (reportData: ReportFormValues) => {
      const payload = {
        status: reportData.status,
        recipientNotes: reportData.recipientNotes,
      };
      return axios.patch(
        `${API_URL}/api/reports/${selectedReport!.id}`,
        payload
      );
    },
    onSuccess: () => {
      toast.success("Report atualizado com sucesso!");
      setIsViewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reportsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao atualizar report", {
        description: error.response?.data?.message,
      }),
  });

  // --- Event Handlers (simplified) ---
  const handleCreateSubmit = (formData: ReportFormValues) =>
    createReport(formData);
  const handleUpdateSubmit = (formData: ReportFormValues) =>
    updateReport(formData);

  const handleActionClick = () => {
    form.reset();
    setIsCreateModalOpen(true);
  };

  const handleRowClick = (report: ExtendedReport, table: string) => {
    form.reset({
      title: report.title,
      content: report.content,
      recipientNotes: report.recipientNotes ?? "",
      status: report.status,
      recipientRoleId: report.recipientRoleId ?? undefined,
      recipientUserId: report.recipientUserId ?? undefined,
    });
    setSelectedReport(report);
    setIsMyReports(table === "myReports");
    setIsEditing(table !== "myReports"); // Only allow editing if it's a report for you
    setIsViewModalOpen(true);
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
            "bg-red-500/20 text-red-400": row.status === ReportStatus.REJECTED, // Supondo que REVIEWED seja um estado de "rejeitado"
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
        { value: "REJECTED", label: "Rejeitado" },
        { value: "DRAFT", label: "Rascunho" },
      ],
      renderView: (row) => {
        switch (row.status) {
          case ReportStatus.DRAFT:
            return "Rascunho";
          case ReportStatus.SUBMITTED:
            return "Em análise";
          case ReportStatus.APPROVED:
            return "Aprovado";
          case ReportStatus.REJECTED:
            return "Recusado";
          default:
            return "Desconhecido";
        }
      },
    },
    {
      header: "Destinatário",
      accessorKey: "recipientUserId",
      type: "text",
      renderView: (row) => {
        const typedRow = row as Partial<ExtendedReport>;

        // Usa os objetos aninhados se estiverem disponíveis
        const userName = typedRow.recipientUser?.name;
        const roleName = typedRow.recipientRole?.name;

        // Fallback via ID se necessário (buscando manualmente)
        const userFromId = data.allUsers.find(
          (u) => u.id === typedRow.recipientUserId
        )?.name;
        const roleFromId = data.allRoles.find(
          (r) => r.id === typedRow.recipientRoleId
        )?.name;

        return (
          userName || roleName || userFromId || roleFromId || "Não especificado"
        );
      },
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
        { value: "REJECTED", label: "Rejeitado" },
        { value: "DRAFT", label: "Rascunho" },
      ],
    },
  ];

  if (isLoadingData)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
      </div>
    );
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
          data={data.myReports}
          onRowClick={(row) => handleRowClick(row, "myReports")}
          filterColumns={["title", "recipientUser", "status"]}
        />
        <CustomTable<ExtendedReport>
          title="Reports para Mim"
          type="onlyView"
          columns={reportsColumns}
          onRowClick={(row) => handleRowClick(row, "reportsForMe")}
          filterColumns={["title", "recipientUser", "status"]}
          data={data.reportsForMe}
        />
      </div>
      <ReportFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        form={form}
        isLoading={isCreating}
        onSubmit={handleCreateSubmit}
        users={data.allUsers.map((u) => ({ value: u.id, label: u.name }))}
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
        isLoading={isUpdating}
        onlyView={isMyReports}
      />
    </>
  );
};

export default ReportsContent;
