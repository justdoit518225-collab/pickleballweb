import { Logo } from "@/components/brand/logo";
import {
  APP_TAGLINE,
  CONTACT_LINE_ID,
  CONTACT_LINE_URL,
} from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center">
        <Logo href="/" variant="stacked" iconSize={56} nameSize="lg" />
        <p className="text-sm text-slate-500">{APP_TAGLINE}</p>
        <p className="text-sm text-slate-600">
          聯繫資訊{" "}
          <a
            href={CONTACT_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-teal underline-offset-2 hover:underline"
          >
            LINE {CONTACT_LINE_ID}
          </a>
        </p>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} PlayPlayPlay
        </p>
      </div>
    </footer>
  );
}
