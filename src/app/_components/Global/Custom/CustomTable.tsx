import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "./Pagination";
import TableFilter from "./TableFilter";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

export interface ColumnDef<T> {
  accessorKey: keyof T | "select" | "actions";
  header: string | React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

type TableType = "default" | "onlyView" | "onlyDelete" | "noSelection" | "onlyEdit";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// ─── Componentes de colunas de ação ─────────────────────────────────

interface ActionCellProps<T> {
  row: T;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isRowEditable?: (row: T) => boolean;
  isRowDeletable?: (row: T) => boolean;
}

function ActionCell<T>({
  row,
  onEdit,
  onDelete,
  isRowEditable,
  isRowDeletable,
}: ActionCellProps<T>) {
  return (
    <div className="flex justify-end gap-2">
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="hover:!bg-[#f5b719]/10"
          disabled={isRowEditable ? !isRowEditable(row) : false}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
        >
          <Pencil className="h-4 w-4" color="#f5b719" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          disabled={isRowDeletable ? !isRowDeletable(row) : false}
          className="hover:!bg-red-500/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      )}
    </div>
  );
}

function buildActionColumn<T>(
  type: TableType,
  onEdit?: (row: T) => void,
  onDelete?: (row: T) => void,
  isRowEditable?: (row: T) => boolean,
  isRowDeletable?: (row: T) => boolean,
): ColumnDef<T> | null {
  if (type === "onlyView") return null;

  const showEdit = type === "default" || type === "noSelection" || type === "onlyEdit";
  const showDelete = type === "default" || type === "noSelection" || type === "onlyDelete";

  return {
    accessorKey: "actions",
    header: "Ações",
    className: "text-right",
    cell: (row) => (
      <ActionCell
        row={row}
        onEdit={showEdit ? onEdit : undefined}
        onDelete={showDelete ? onDelete : undefined}
        isRowEditable={isRowEditable}
        isRowDeletable={isRowDeletable}
      />
    ),
  };
}

// ─── Componente principal ───────────────────────────────────────────

interface CustomTableProps<T> {
  title: string;
  type?: TableType;
  data: T[];
  message?: string;
  columns: ColumnDef<T>[];
  filterColumns: string[];
  itemsPerPage?: number;
  isActionLoading?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  handleActionClick?: () => void;
  isRowDeletable?: (row: T) => boolean;
  isRowEditable?: (row: T) => boolean;
  disabled?: boolean;
  onExportClick?: () => void;
}

function CustomTable<T extends { id: string | number }>({
  title,
  type = "default",
  message = "Nenhum resultado encontrado.",
  data = [],
  columns = [],
  filterColumns,
  itemsPerPage = 5,
  disabled,
  isRowEditable,
  isRowDeletable,
  onEdit,
  onDelete,
  isActionLoading,
  onRowClick,
  onSelectionChange,
  handleActionClick,
  onExportClick,
}: CustomTableProps<T>) {
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  const filteredData = useMemo(() => {
    if (!filter) return data;
    const normalizedFilter = filter
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return data.filter((row) =>
      filterColumns.some((key) => {
        const value = getNestedValue(row as unknown as Record<string, unknown>, key);
        return String(value)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(normalizedFilter);
      })
    );
  }, [data, filter, filterColumns]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  useEffect(() => {
    onSelectionChange?.(selectedRows);
  }, [selectedRows, onSelectionChange]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleSelectRow = (row: T) => {
    setSelectedRows((prev) => {
      const isSelected = prev.some((r) => r.id === row.id);
      return isSelected
        ? prev.filter((r) => r.id !== row.id)
        : [...prev, row];
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? paginatedData : []);
  };

  const isAllOnPageSelected =
    paginatedData.length > 0 && selectedRows.length === paginatedData.length;

  // Montar as colunas finais de forma declarativa
  const finalColumns = useMemo(() => {
    const cols: ColumnDef<T>[] = [];

    // Coluna de seleção (apenas no tipo default)
    if (type === "default") {
      cols.push({
        accessorKey: "select",
        header: (
          <Checkbox
            checked={isAllOnPageSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Selecionar todos"
          />
        ),
        cell: (row) => (
          <Checkbox
            checked={selectedRows.some((r) => r.id === row.id)}
            onCheckedChange={() => handleSelectRow(row)}
            aria-label="Selecionar linha"
          />
        ),
        className: "w-12",
      });
    }

    // Colunas de dados
    cols.push(...columns);

    // Coluna de ações
    const actionCol = buildActionColumn(type, onEdit, onDelete, isRowEditable, isRowDeletable);
    if (actionCol) cols.push(actionCol);

    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedRows e isAllOnPageSelected mudam com frequência mas não afetam a estrutura das colunas
  }, [type, columns, onEdit, onDelete, isRowEditable, isRowDeletable, selectedRows, isAllOnPageSelected]);

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg overflow-y-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#010d26]">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h2 className="text-2xl font-bold text-[#0126fb]">{title}</h2>
        <div className="flex items-center flex-wrap sm:flex-nowrap justify-end gap-4">
          <TableFilter
            onFilterChange={setFilter}
            placeholder="Pesquisar na tabela..."
          />

          {onExportClick && (
            <Button
              variant="outline"
              className="bg-transparent border-green-500 text-green-500 hover:!bg-green-500/10 hover:border-green-400 hover:!text-green-400"
              onClick={onExportClick}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}

          {handleActionClick && (
            <Button
              disabled={disabled}
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 cursor-pointer"
              onClick={handleActionClick}
            >
              {isActionLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-auto scrollbar-thin scrollbar-thumb-[#0126fb] scrollbar-track-[#00205e]">
        <Table className="table-auto">
          <TableHeader>
            <TableRow className="border-b border-gray-700 hover:bg-transparent">
              {finalColumns.map((column) => (
                <TableHead
                  key={String(column.accessorKey)}
                  className={cn("text-[#0126fb] font-bold", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-gray-800 hover:bg-white/5 cursor-pointer w-fit"
                  onClick={() => onRowClick?.(row)}
                >
                  {finalColumns.map((column) => (
                    <TableCell
                      key={String(column.accessorKey)}
                      className={cn("py-4 max-w-fit", column.className)}
                      onClick={(e) => {
                        if (
                          column.accessorKey === "select" ||
                          column.accessorKey === "actions"
                        )
                          e.stopPropagation();
                      }}
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.accessorKey !== "select" &&
                            column.accessorKey !== "actions"
                          ? String(row[column.accessorKey])
                          : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-24 text-center text-gray-400"
                >
                  {message}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

export default CustomTable;
