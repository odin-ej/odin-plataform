"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import CustomSelect from "../../Global/Custom/CustomSelect";
import CustomInput from "../../Global/Custom/CustomInput";
import { Role } from "@prisma/client";
import { FileText, Link2, Trash2, UploadCloud } from "lucide-react";
import { FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RoleHistoryManagerProps {
  roles: Role[];
}

const ReportUploader = ({ index }: { index: number }) => {
  const { watch, setValue } = useFormContext();
  const fileInputId = `report-upload-${index}`;

  // Observa o valor do campo de relatório específico para esta linha
  const currentReport = watch(`roleHistory.${index}.managementReport`);

  // Define os diferentes estados
  const hasExistingReport =
    currentReport &&
    typeof currentReport === "object" &&
    "url" in currentReport;
  const hasNewFile = currentReport instanceof File;

  return (
    <div className="space-y-2 min-w-1/2 lg:w-1/2">
      <FormLabel className="text-white text-sm font-medium">
        Relatório de Gestão (Opcional)
      </FormLabel>

      {/* Estado 1: Um relatório já existe no banco de dados */}
      {hasExistingReport && (
        <div className="flex flex-col-reverse items-center gap-2">
          <a
            href={currentReport.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#f5b719] hover:underline break-all flex items-center gap-1.5"
          >
            <Link2 className="h-4 w-4" /> {currentReport.fileName}
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs text-[#f5b719] hover:text-white transition-colors bg-transparent hover:bg-[#f5b719]/10 border-2 border-white hover:border-[#f5b719] rounded-md"
          >
            <label htmlFor={fileInputId} className="cursor-pointer">
              <UploadCloud className="h-3 w-3 mr-2" /> Substituir
            </label>
          </Button>
        </div>
      )}

      {/* Estado 2: O usuário acabou de selecionar um novo arquivo */}
      {hasNewFile && (
        <Button
          asChild
          type="button"
          className="flex items-center text-sm p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md"
        >
          <label
            htmlFor={fileInputId}
            className="truncate cursor-pointer w-full"
          >
            <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
            {currentReport.name}
          </label>
        </Button>
      )}

      {/* Estado 3: Nenhum arquivo selecionado ou existente */}
      {!hasExistingReport && !hasNewFile && (
        <Button
          type="button"
          variant="outline"
          className="text-xs text-[#f5b719] hover:text-white transition-colors bg-transparent hover:bg-[#f5b719]/10 border-2 border-white hover:border-[#f5b719] rounded-md"
          asChild
        >
          <label htmlFor={fileInputId} className="cursor-pointer w-full">
            <UploadCloud className="h-4 w-4 mr-2" /> Anexar Relatório
          </label>
        </Button>
      )}

      {/* O input de arquivo está sempre presente, mas escondido */}
      <Input
        id={fileInputId}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setValue(
              `roleHistory.${index}.managementReport`,
              e.target.files[0]
            );
          }
        }}
      />
      <FormMessage />
    </div>
  );
};

const RoleHistoryManager = ({ roles }: RoleHistoryManagerProps) => {

  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "roleHistory", // O nome do campo no seu Zod schema
  });

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
  return (
    <div className="space-y-4 p-4 border border-dashed border-gray-600 rounded-lg">
      <h3 className="font-semibold text-lg text-[#f5b719]">
        Histórico de Cargos na Empresa
      </h3>
      <p className="text-sm text-gray-400">
        Adicione os cargos que você já ocupou e os respectivos semestres. Esta
        informação é valiosa para o nosso histórico.
      </p>

      <div className="space-y-3">
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="flex items-center gap-2 p-3 bg-[#00205e]/30 rounded-md border border-gray-700"
            >
              {/* Colunas de Cargo e Semestre (sem alteração) */}
              <div className="flex-1">
                <CustomSelect
                  name={`roleHistory.${index}.roleId`}
                  options={roleOptions}
                  label="Cargo"
                  control={control}
                  placeholder="Cargo"
                />
              </div>
              <div className="w-1/3">
                <CustomInput
                  field={`roleHistory.${index}.semester`}
                  placeholder="Ex: 2024.1"
                  label="Semestre"
                  control={control}
                />
              </div>

              {/* LÓGICA DE EXIBIÇÃO DO ARQUIVO */}

              <div className="flex-1 flex items-center justify-center gap-2 relative">
    
                  <ReportUploader index={index} />
               
                  <CustomInput
                    field={`roleHistory.${index}.managementReportLink`}
                    placeholder="Cole o link do relatório aqui"
                    label="Link do Relatório de Gestão (Opcional)"
                    control={control}
                  />
               
              </div>

              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="bg-transparent"
        onClick={() => append({ roleId: "", semester: "" })}
      >
        + Adicionar Cargo ao Histórico
      </Button>
    </div>
  );
};

export default RoleHistoryManager;
