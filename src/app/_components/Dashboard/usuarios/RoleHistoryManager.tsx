"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import CustomSelect from "../../Global/Custom/CustomSelect";
import CustomInput from "../../Global/Custom/CustomInput";
import { Role } from "@prisma/client";
import {  Trash2 } from "lucide-react";
import { FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RoleHistoryManagerProps {
  roles: Role[];
}

const RoleHistoryManager = ({ roles }: RoleHistoryManagerProps) => {
  const { control, watch, register } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "roleHistory", // O nome do campo no seu Zod schema
  });

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
  const roleHistoryValues = watch("roleHistory");
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
          // Pega o valor atual do relatório para este item do histórico
          const currentReport = roleHistoryValues[index]?.managementReport;
          const hasExistingReport = currentReport;
          return (
            <div
              key={field.id}
              className="flex items-end gap-2 p-3 bg-[#00205e]/30 rounded-md border border-gray-700"
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
              <div className="">
                <FormLabel className="text-white text-sm font-medium">
                  Relatório de Gestão (Opcional)
                </FormLabel>
               
                {/* Usamos um <Input> nativo com `form.register` aqui.
                  Isso garante que o react-hook-form receba o objeto File corretamente.
                */}
                <Input
                  type="file"
                  className="cursor-pointer file:text-[#f5b719] file:border-0 file:bg-transparent hover:file:text-[#f5b719]/80"
                  {...register(`roleHistory.${index}.managementReport`)}
                />
                {/* A validação Zod mostrará o erro aqui, se houver */}
                 {hasExistingReport && (
                  <div className="">
                    <a
                      href={hasExistingReport.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#f5b719] hover:underline break-all"
                    >
                      {hasExistingReport.fileName}
                    </a>
                  </div>
                )}
                <FormMessage />
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
