"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ContactInboxRefresher() {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => window.clearInterval(t);
  }, [router]);
  return null;
}
