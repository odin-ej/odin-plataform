/* eslint-disable @typescript-eslint/no-explicit-any */
import { JRPointsVersion, Semester, UserSemesterScore } from "@prisma/client";
import React, { useMemo, useState } from "react";
import { Loader2, Upload, Download, History } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import { format } from "date-fns";
import CustomSelect from "../../Global/Custom/CustomSelect";

interface DataManagementPanelProps {
  onImport: (data: any) => void;
  onSnapshot: (semesterId: string) => void; // Agora recebe o ID do semestre
  versions: JRPointsVersion[];
  semesters: Semester[]; // Adicionado
  snapshots: UserSemesterScore[];
  onVersionToggle: (params: { id: string; isActive: boolean }) => void;
  onSemesterToggle: (params: { id: string; isActive: boolean }) => void; // Adicionado
  onExportTemplate: () => void;
  onCreateVersion: () => void;
  onCreateSemester: () => void; // Adicionado
  onEditSemester: (semester: Semester) => void; // Adicionado
  onEditVersion: (version: JRPointsVersion) => void;
  setItemToDelete: (item: {
    type: "version" | "snapshot" | "semester";
    id: string;
  }) => void; // Adicionado
  isDisabled: boolean;
}

type SnapshotSummary = {
  id: string; // Usaremos o nome do semestre como ID único para a tabela
  semester: string;
  createdAt: Date;
  userCount: number;
};

const DataManagementPanel = ({
  onImport,
  onSnapshot,
  versions,
  semesters,
  snapshots,
  onVersionToggle,
  onSemesterToggle,
  onExportTemplate,
  onCreateVersion,
  onCreateSemester,
  onEditSemester,
  onEditVersion,
  setItemToDelete,
  isDisabled,
}: DataManagementPanelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedSnapshotSemesterId, setSelectedSnapshotSemesterId] =
    useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleImportClick = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo para importar.");
      return;
    }
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e?.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        await onImport(json);
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast.error("Falha ao ler o arquivo.", { description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  const snapshotSummaryData: SnapshotSummary[] = useMemo(() => {
    const grouped = snapshots.reduce(
      (acc, shot) => {
        if (!acc[shot.semester]) {
          acc[shot.semester] = [];
        }
        acc[shot.semester].push(shot);
        return acc;
      },
      {} as Record<string, UserSemesterScore[]>
    );

    return Object.entries(grouped).map(([semester, scores]) => ({
      id: semester, // O nome do semestre é o identificador
      semester: semester,
      // Pega a data do primeiro registro como referência
      createdAt: scores.length > 0 ? new Date(scores[0].createdAt) : new Date(),
      userCount: scores.length,
    }));
  }, [snapshots]);

  // Colunas para a nova tabela de resumo
  const snapshotSummaryColumns: ColumnDef<SnapshotSummary>[] = [
    { accessorKey: "semester", header: "Nome do Snapshot" },
    {
      accessorKey: "createdAt",
      header: "Data de Criação",
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy"),
    },
    {
      accessorKey: "userCount",
      header: "Membros Inclusos",
      className: "text-center",
    },
  ];

  const versionColumns: ColumnDef<JRPointsVersion>[] = [
    { accessorKey: "versionName", header: "Nome da Versão" },
    {
      accessorKey: "implementationDate",
      header: "Início",
      cell: (row) => format(new Date(row.implementationDate), "dd/MM/yyyy"),
    },
    {
      accessorKey: "endDate",
      header: "Fim",
      cell: (row) =>
        row.endDate ? format(new Date(row.endDate), "dd/MM/yyyy") : "Contínuo",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={row.isActive ? "default" : "outline"}
          className={
            row.isActive
              ? "bg-green-500 hover:bg-green-600"
              : "text-muted-foreground border-muted-foreground hover:text-muted "
          }
        >
          {row.isActive ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
  ];

  const semesterColumns: ColumnDef<Semester>[] = [
    { accessorKey: "name", header: "Nome do Semestre" },
    {
      accessorKey: "startDate",
      header: "Início",
      cell: (row) => format(new Date(row.startDate), "dd/MM/yyyy"),
    },
    {
      accessorKey: "endDate",
      header: "Fim",
      cell: (row) =>
        row.endDate ? format(new Date(row.endDate), "dd/MM/yyyy") : "Em aberto",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={row.isActive ? "default" : "outline"}
          className={
            row.isActive
              ? "bg-green-500 hover:bg-green-600"
              : "text-muted-foreground border-muted-foreground hover:text-muted"
          }
        >
          {row.isActive ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  const semesterForSnapshotOptions = semesters.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg mt-6">
      <h2 className="text-2xl font-bold text-[#0126fb] mb-4">
        Gestão de Dados
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção de Importação */}
        <div className="space-y-4 p-4 border border-gray-700 rounded-lg flex flex-col">
          <h3 className="font-semibold text-lg flex items-center">
            <Upload className="mr-2 h-5 w-5" /> Importar Modelos de Tags
          </h3>
          <p className="text-sm text-gray-400 flex-grow">
            Faça o upload de uma planilha (.xlsx) para criar ou atualizar
            modelos de tags em massa.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onExportTemplate}
              className="text-xs bg-transparent border-[#f5b719] text-[#f5b719] hover:text-[#f5b719]/80 hover:border-[#f5b719]/80 hover:bg-transparent"
            >
              <Download className="mr-2 h-4 w-4" /> Baixar Planilha Modelo
            </Button>
            <input
              type="file"
              id="file-upload"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-[#00205e] hover:bg-[#00205e]/80 text-white px-4 py-2 rounded-md text-sm text-center truncate"
            >
              {file ? file.name : "Selecionar Arquivo"}
            </label>
          </div>
          <Button
            onClick={handleImportClick}
            disabled={!file || isImporting}
            className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
          >
            {isImporting ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? "Importando..." : "Iniciar Importação"}
          </Button>
        </div>

        {/* --- SEÇÃO DE SNAPSHOT ATUALIZADA --- */}
        <div className="space-y-4 p-4 border border-gray-700 rounded-lg flex flex-col">
          <h3 className="font-semibold text-lg flex items-center">
            <History className="mr-2 h-5 w-5" /> Finalizar Semestre (Snapshot)
          </h3>
          <p className="text-sm text-gray-400 flex-grow">
            Selecione um semestre para salvar o placar final de todos os membros
            e zerar a pontuação geral. Esta ação não pode ser desfeita.
          </p>
          <CustomSelect
            placeholder="Selecione um semestre para finalizar..."
            options={semesterForSnapshotOptions}
            value={selectedSnapshotSemesterId}
            onValueChange={(newValue) => {
              // onValueChange retorna o NOVO VALOR selecionado.
              // Usamos ele para atualizar o nosso estado.
              setSelectedSnapshotSemesterId(newValue);
            }}
          />
          <Button
            onClick={() => {
              if (!selectedSnapshotSemesterId) {
                toast.error(
                  "Por favor, selecione um semestre para criar o snapshot."
                );
                return;
              }
              onSnapshot(selectedSnapshotSemesterId);
            }}
            disabled={!selectedSnapshotSemesterId}
            className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
          >
            <History className="mr-2 h-4 w-4" /> Salvar Snapshot e Zerar Pontos
          </Button>
        </div>
      </div>

      {/* --- NOVA SEÇÃO DE SEMESTRES --- */}
      <div className="mt-6">
        <CustomTable<Semester>
          title="Períodos (Semestres)"
          columns={semesterColumns}
          data={semesters || []}
          filterColumns={["name"]}
          onRowClick={(semester) =>
            onSemesterToggle({ id: semester.id, isActive: !semester.isActive })
          }
          message="Nenhum semestre encontrado. Crie um para iniciar um período de pontuação."
          type="noSelection"
          handleActionClick={onCreateSemester}
          onDelete={(semester) =>
            setItemToDelete({ id: semester.id, type: "semester" })
          }
          onEdit={onEditSemester}
          itemsPerPage={5}
          disabled={isDisabled}
        />
      </div>
      {/* Seção de Versões */}
      <div className="mt-6">
        <CustomTable<JRPointsVersion>
          title="Versões de Regras (Modelos de Tags)"
          columns={versionColumns}
          data={versions || []}
          filterColumns={["versionName"]}
          onRowClick={(version) =>
            onVersionToggle({ id: version.id, isActive: !version.isActive })
          }
          message="Nenhuma versão encontrada. Crie uma na área de gestão."
          type="noSelection"
          handleActionClick={onCreateVersion}
          onDelete={(version) =>
            setItemToDelete({ id: version.id, type: "version" })
          }
          onEdit={onEditVersion}
          itemsPerPage={5}
          disabled={isDisabled}
        />
      </div>
      {/* Seção de Snapshots Salvos */}
      <div className="mt-6">
        <CustomTable<SnapshotSummary>
          title="Histórico de Snapshots"
          columns={snapshotSummaryColumns}
          data={snapshotSummaryData}
          filterColumns={["semester"]}
          message="Nenhum snapshot foi salvo ainda."
          type="onlyDelete"
          onDelete={(summaryRow) =>
            // A deleção funciona com o nome do semestre, que é o 'id' do nosso resumo
            setItemToDelete({ id: summaryRow.id, type: "snapshot" })
          }
        />
      </div>
    </div>
  );
};

export default DataManagementPanel;
