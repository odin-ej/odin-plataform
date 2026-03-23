"use client";
import { Value } from "@prisma/client";
import ValueItem from "./ValueItem";

// As props agora recebem a função de atualização e o estado de loading
interface Props {
  values: Value[];
  onUpdateValue: (data: Partial<Value> & { id: string }) => void;
  isUpdatingValue: boolean;
}

export function StrategyValuesSection({
  values,
  onUpdateValue,
  isUpdatingValue,
}: Props) {
  // A função 'handleUpdateDatabase' foi REMOVIDA daqui.
  // O 'useRouter' também não é mais necessário.
  return (
    <div className="space-y-4">
      <h3 className="text-2xl text-[#f5b719] font-bold">Valores da Casinha</h3>

      {values.map((value) => (
        <ValueItem
          key={value.id}
          initialValue={value}
          // Passamos a função e o estado de loading diretamente para o item filho
          onUpdate={onUpdateValue}
          isUpdating={isUpdatingValue}
        />
      ))}
    </div>
  );
}
