/** Greeting — rendered below the sticky DashboardTopbar, inside the scrollable content area. */
export function WelcomeBanner({ greetingName, subtitle }: { greetingName: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Welcome back, {greetingName}! 👋</h1>
      <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
    </div>
  );
}
