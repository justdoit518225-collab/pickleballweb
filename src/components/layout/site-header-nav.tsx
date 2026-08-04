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
      ? "rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-brand-navy"
      : "text-slate-600 transition-colors hover:text-brand-navy";
  const strong =
    variant === "mobile"
      ? "rounded-lg px-3 py-2.5 font-medium text-brand-navy hover:bg-slate-50"
      : "font-medium text-brand-navy";
  const cta =
    variant === "mobile"
      ? "rounded-lg px-3 py-2.5 font-medium text-brand-teal hover:bg-slate-50 hover:text-brand-navy"
      : "font-medium text-brand-teal hover:text-brand-navy";

  return (
    <>
      <Link href={ROUTES.doublesScheduler} className={item} onClick={onNavigate}>
        賽程產生器
      </Link>
      <Link href={ROUTES.paddles} className={item} onClick={onNavigate}>
        匹克球拍
      </Link>
      <Link href={`${ROUTES.home}#clubs`} className={item} onClick={onNavigate}>
        探索俱樂部
      </Link>
      {signedIn ? (
        <>
          <Link href={ROUTES.meInbox} className={item} onClick={onNavigate}>
            通知{unreadCount ? ` (${unreadCount})` : ""}
          </Link>
          <Link href={ROUTES.me} className={strong} onClick={onNavigate}>
            會員中心
          </Link>
          <div
            className={
              variant === "mobile" ? "px-3 py-2.5" : undefined
            }
            onClick={onNavigate}
          >
            <SignOutButton />
          </div>
        </>
      ) : (
        <Link href="/login" className={cta} onClick={onNavigate}>
          登入
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
      <nav className="hidden items-center gap-4 text-sm md:flex">
        <NavLinks
          signedIn={signedIn}
          unreadCount={unreadCount}
          variant="desktop"
        />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-navy hover:bg-slate-100"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "關閉選單" : "開啟選單"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-slate-900/30"
              aria-label="關閉選單"
              onClick={close}
            />
            <nav
              id={menuId}
              className="absolute inset-x-0 top-full z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-lg"
            >
              <div className="mx-auto flex max-w-5xl flex-col text-sm">
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
