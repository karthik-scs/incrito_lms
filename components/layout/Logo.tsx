"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import lightLogo from "@/app/assets/incrito_light_logo_web.png";
import darkLogo from "@/app/assets/incrito_dark_logo_web.png";

type Background = "auto" | "light" | "dark";

// Both wordmark PNGs are 4786x1259 px.
const LOGO_ASPECT_RATIO = 4786 / 1259;

/**
 * incrito wordmark. `background="auto"` (default) follows the current site theme
 * (observes the `.dark` class on <html> set by ThemeToggle). Use `background="dark"`
 * on always-colored surfaces (e.g. the auth pages' gradient panel) regardless of
 * site theme, since the light-colored logo variant is what reads there.
 *
 * Both `width` and `height` are passed as explicit numbers computed from the source
 * file's real aspect ratio (not inferred by next/image, not driven by a Tailwind class)
 * — that ambiguity is what caused the logo to render at native (huge) size before.
 */
export function Logo({
  className,
  background = "auto",
  height = 28,
}: {
  className?: string;
  background?: Background;
  height?: number;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (background !== "auto") return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [background]);

  const onDarkSurface = background === "auto" ? isDark : background === "dark";
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  return (
    <Image
      src={onDarkSurface ? darkLogo : lightLogo}
      alt="incrito"
      width={width}
      height={height}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={className}
      priority
    />
  );
}
