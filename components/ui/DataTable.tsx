import { Loader2 } from "lucide-react";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  emptyMessage = "Nothing here yet.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-text-secondary text-sm">
        <Loader2 size={18} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (error) {
    return <p className="py-16 text-center text-sm text-error">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="py-16 text-center text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.header}
                className={`text-left font-medium text-text-secondary px-4 py-3 whitespace-nowrap ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border-light last:border-0">
              {columns.map((column) => (
                <td key={column.header} className={`px-4 py-3 text-text-primary ${column.className ?? ""}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
