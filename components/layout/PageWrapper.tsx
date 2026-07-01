export function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1440px] mx-auto px-8 py-8">{children}</div>;
}
