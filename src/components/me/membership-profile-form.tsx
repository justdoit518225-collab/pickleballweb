"use client";

import { useRef, useState } from "react";
import { updateMembershipProfile } from "@/app/me/actions";
import { Avatar } from "@/components/ui/avatar";

export function MembershipProfileForm({
  membershipId,
  tenantId,
  tenantName,
  nicknameDefault,
  avatarPreviewUrl,
  loginFallbackName,
}: {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  nicknameDefault: string;
  avatarPreviewUrl: string | null;
  loginFallbackName: string;
}) {
  const [preview, setPreview] = useState<string | null>(avatarPreviewUrl);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      alert("圖片請小於 512 KB");
      e.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("僅支援 JPG、PNG、WebP");
      e.target.value = "";
      return;
    }
    setRemoveAvatar(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearCustomAvatar() {
    setRemoveAvatar(true);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      action={updateMembershipProfile}
      encType="multipart/form-data"
      className="space-y-4 rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "on" : "off"} />

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <Avatar src={preview} name={nicknameDefault || tenantName} size="md" />
        <h2 className="text-lg font-semibold text-slate-800">{tenantName}</h2>
      </div>

      <div>
        <label htmlFor={`nickname-${membershipId}`} className="block text-sm font-medium text-slate-700">
          暱稱
        </label>
        <input
          id={`nickname-${membershipId}`}
          name="nickname"
          defaultValue={nicknameDefault}
          placeholder={loginFallbackName}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">頭像</span>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Avatar src={preview} name={nicknameDefault || tenantName} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <input
              ref={fileRef}
              id={`avatar-file-${membershipId}`}
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
            />
            <p className="text-xs text-slate-500">JPG / PNG / WebP，最大 512 KB</p>
            {preview && (
              <button
                type="button"
                onClick={clearCustomAvatar}
                className="text-xs text-slate-600 underline hover:text-slate-800"
              >
                移除自訂頭像
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        儲存
      </button>
    </form>
  );
}
