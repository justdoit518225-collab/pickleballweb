"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function CourtMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal], [data-enter]")
    );
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          const delay = Number(el.dataset.revealDelay || idx * 55);
          el.style.transition = `transform 520ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 520ms ease ${delay}ms`;
          el.style.transform = "translateY(16px)";
          el.style.opacity = "0.88";
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transform = "translateY(0px)";
              el.style.opacity = "1";
            });
          });
        });
      },
      { threshold: 0.08 }
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
