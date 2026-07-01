import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-[1440px] mx-auto px-8 py-6 flex items-center justify-between text-sm text-text-secondary">
        <span>© {new Date().getFullYear()} incrito LMS. All rights reserved.</span>
        <nav className="flex gap-6">
          <Link href="/support" className="hover:text-accent transition-colors">
            Support
          </Link>
          <Link href="/privacy" className="hover:text-accent transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-accent transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
