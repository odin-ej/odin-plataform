"use client";

import {  useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import CustomSelect from "../../Global/Custom/CustomSelect";
import CustomInput from "../../Global/Custom/CustomInput";
import { Role } from "@prisma/client";
import { Trash2 } from "lucide-react";


interface RoleHistoryManagerProps {
  roles: Role[];
}

const RoleHistoryManager = ({ roles,  }: RoleHistoryManagerProps) => {
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "roleHistory", // O nome do campo no seu Zod schema
  });

  const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-4 p-4 border border-dashed border-gray-600 rounded-lg">
      <h3 className="font-semibold text-lg text-[#f5b719]">Histórico de Cargos na Empresa</h3>
      <p className="text-sm text-gray-400">Adicione os cargos que você já ocupou e os respectivos semestres. Esta informação é valiosa para o nosso histórico.</p>
      
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2 p-3 bg-[#00205e]/30 rounded-md border border-gray-700">
            <div className="flex-1">
              <CustomSelect
                control={control}
                name={`roleHistory.${index}.roleId`}
                label="Cargo"
                placeholder="Selecione um cargo..."
                options={roleOptions}
              />
            </div>
            <div className="w-1/3">
              <CustomInput
                control={control} // Passa o 'control' diretamente
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                field={`roleHistory.${index}.semester` as any}
                label="Semestre"
                placeholder="Ex: 2024.1"
              />
            </div>
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="bg-transparent" onClick={() => append({ roleId: "", semester: "" })}>
        + Adicionar Cargo ao Histórico
      </Button>
    </div>
  );
};

export default RoleHistoryManager