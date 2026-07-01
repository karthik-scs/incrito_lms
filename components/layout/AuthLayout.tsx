import Image from "next/image";
import { BookOpen, TrendingUp, Users } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import cubeIllustration from "@/app/assets/login_page_icon.png";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Structured Learning",
    description: "Access high-quality structured and learning paths",
  },
  {
    icon: Users,
    title: "Expert Mentors",
    description: "Learn from industry experts and grow your skills",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "Monitor your progress and achieve your goals",
  },
];

// login_page_icon.png is 1536x1024 px.
const CUBE_WIDTH = 144;
const CUBE_HEIGHT = Math.round(CUBE_WIDTH * (1024 / 1536));

/**
 * Shared shell for the auth pages (login/signup/verify-otp/forgot-password/reset-password):
 * gradient left panel (logo, headline, feature list, progress card) + a top-right ThemeToggle
 * and centered form area on the right. `showIllustration` swaps in the cube graphic used on
 * the Signup mockup specifically; other auth pages just show the feature list.
 *
 * Fixed to viewport height (`h-screen`, not `min-h-screen`) so the page itself never scrolls.
 * The left panel is decorative and sized to always fit, so it clips (`overflow-hidden`) rather
 * than scroll — `overflow-y-auto` there produced a visible scrollbar track at the column
 * boundary even when there was nothing to scroll. The right panel keeps `overflow-y-auto` since
 * its form content can genuinely exceed the viewport on a short window (e.g. Signup).
 */
export function AuthLayout({
  children,
  showIllustration = false,
}: {
  children: React.ReactNode;
  showIllustration?: boolean;
}) {
  return (
    <div className="h-screen grid lg:grid-cols-2 overflow-hidden">
      <div
        className="hidden lg:flex flex-col px-12 py-12 text-accent-foreground overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)" }}
      >
        <Logo background="dark" height={26} />

        <div className="flex-1 flex flex-col justify-center max-w-sm">
          <h1 className="text-3xl font-bold leading-tight">Learn. Practice. Verify. Get Hired</h1>
          <p className="mt-4 text-sm opacity-90">
            Incrito is your all-in-one learning platform to track progress, join live sessions, and reach your
            goals.
          </p>

          {showIllustration && (
            <div className="my-6 flex justify-center">
              <Image
                src={cubeIllustration}
                alt=""
                width={CUBE_WIDTH}
                height={CUBE_HEIGHT}
                style={{ width: `${CUBE_WIDTH}px`, height: `${CUBE_HEIGHT}px` }}
              />
            </div>
          )}

          <ul className={showIllustration ? "mt-2 space-y-5" : "mt-10 space-y-5"}>
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-white/15 shrink-0">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 rounded-2xl bg-white/10 p-4 max-w-[220px]">
          <p className="text-xs opacity-80">Your Progress</p>
          <p className="text-2xl font-bold mt-1">75%</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-white" style={{ width: "75%" }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col px-8 py-8 sm:px-16 overflow-y-auto">
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
