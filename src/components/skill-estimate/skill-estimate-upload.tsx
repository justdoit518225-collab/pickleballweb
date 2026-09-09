"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/lib/constants";
import { SKILL_MAX_BYTES } from "@/lib/skill-estimate";

export function SkillEstimateUpload({
  analyzerConfigured,
  existingJobId,
}: {
  analyzerConfigured: boolean;
  existingJobId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    if (file.size > SKILL_MAX_BYTES) {
      setError("影片請小於 200MB，並剪成 3–5 分鐘精華");
      return;
    }

    setBusy(true);
    setProgress(2);
    try {
      let jobId = existingJobId ?? "";
      let target = "";

      if (existingJobId) {
        const res = await fetch(`/api/skill-estimate/${existingJobId}`);
        const payload = (await res.json()) as { error?: string; uploadUrl?: string | null };
        if (!res.ok || !payload.uploadUrl) {
          throw new Error(payload.error ?? "此任務無法重新上傳");
        }
        target = payload.uploadUrl;
      } else {
        const created = await fetch("/api/skill-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "video/mp4",
            size: file.size,
          }),
        });
        const payload = (await created.json()) as {
          error?: string;
          jobId?: string;
          uploadUrl?: string;
        };
        if (!created.ok || !payload.jobId || !payload.uploadUrl) {
          throw new Error(payload.error ?? "無法建立分析任務");
        }
        jobId = payload.jobId;
        target = payload.uploadUrl;
      }

      await uploadWithProgress(target, file, setProgress);
      router.push(ROUTES.meSkillEstimateJob(jobId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          {existingJobId ? "重新上傳影片" : "上傳對打影片"}
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={!analyzerConfigured || busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
        />
      </label>
      {busy && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand-teal transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {!analyzerConfigured && (
        <p className="text-sm text-amber-700">分析服務未連線，請先啟動本機 skill-analyzer。</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function uploadWithProgress(url: string, file: File, onProgress: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      onProgress(Math.max(5, Math.round((ev.loaded / ev.total) * 95)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(parseError(xhr.responseText) || `上傳失敗（${xhr.status}）`));
    };
    xhr.onerror = () => reject(new Error("無法連線分析服務"));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

function parseError(text: string) {
  try {
    const json = JSON.parse(text) as { detail?: string; error?: string };
    return json.detail ?? json.error ?? null;
  } catch {
    return text.slice(0, 200) || null;
  }
}
