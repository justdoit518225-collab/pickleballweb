"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ROUTES } from "@/lib/constants";

type SiteHeaderNavProps = {
  signedIn: boolean;
  unreadCount: number;
};

type LinkVariant = "desktop" | "mobile";

function NavLinks({
  signedIn,
  unreadCount,
  variant,
  onNavigate,
}: SiteHeaderNavProps & {
  variant: LinkVariant;
  onNavigate?: () => void;
}) {
  const item =
    variant === "mobile"
      ? "px-3 py-3 text-base font-semibold text-brand-navy hover:bg-[var(--surface-alt)]"
      : "text-sm font-semibold text-[var(--muted)] transition-colors hover:text-brand-navy";
  const strong =
    variant === "mobile"
      ? "px-3 py-3 text-base font-bold text-brand-navy hover:bg-[var(--surface-alt)]"
      : "text-sm font-bold text-brand-navy hover:text-brand-teal";
  const cta =
    variant === "mobile"
      ? "mt-2 inline-flex items-center justify-center bg-brand-navy px-4 py-3 text-base font-bold text-white"
      : "inline-flex items-center justify-center bg-brand-navy px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-teal";

  return (
    <>
      <Link href={`${ROUTES.home}#clubs`} className={item} onClick={onNavigate}>
        探索俱樂部
      </Link>
      <Link href={ROUTES.paddles} className={item} onClick={onNavigate}>
        匹克球拍
      </Link>
      <Link href={ROUTES.doublesScheduler} className={item} onClick={onNavigate}>
        雙打排程
      </Link>
      {signedIn ? (
        <>
          <Link href={ROUTES.meInbox} className={item} onClick={onNavigate}>
            通知
            {unreadCount ? (
              <span className="ml-1.5 inline-flex bg-brand-lime px-1.5 py-0.5 text-xs font-extrabold text-brand-navy tabular-nums">
                {unreadCount}
              </span>
            ) : null}
          </Link>
          <Link href={ROUTES.me} className={strong} onClick={onNavigate}>
            會員中心
          </Link>
          <div
            className={variant === "mobile" ? "px-3 py-2.5" : undefined}
            onClick={onNavigate}
          >
            <SignOutButton />
          </div>
        </>
      ) : (
        <Link href="/login" className={cta} onClick={onNavigate}>
          會員登入
        </Link>
      )}
    </>
  );
}

export function SiteHeaderNav({ signedIn, unreadCount }: SiteHeaderNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="hidden items-center gap-7 md:flex">
        <NavLinks
          signedIn={signedIn}
          unreadCount={unreadCount}
          variant="desktop"
        />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center bg-[var(--surface)] text-brand-navy hover:bg-[var(--surface-alt)]"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "關閉選單" : "開啟選單"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={2.2} /> : <Menu className="h-5 w-5" strokeWidth={2.2} />}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-brand-navy/40"
              aria-label="關閉選單"
              onClick={close}
            />
            <nav
              id={menuId}
              className="absolute inset-x-0 top-full z-50 bg-[var(--surface)] px-4 py-5"
            >
              <div className="page-wrap flex flex-col gap-1">
                <NavLinks
                  signedIn={signedIn}
                  unreadCount={unreadCount}
                  variant="mobile"
                  onNavigate={close}
                />
              </div>
            </nav>
          </>
        ) : null}
      </div>
    </>
  );
}
