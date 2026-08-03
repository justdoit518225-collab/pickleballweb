import { PlatformNav } from "@/components/layout/platform-nav";
import { requireSuperAdmin } from "@/lib/authz";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="mb-2 text-sm font-medium tracking-wide text-brand-teal">平台管理</p>
      <PlatformNav />
      {children}
    </div>
  );
}
