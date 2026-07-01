export function DashboardCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
