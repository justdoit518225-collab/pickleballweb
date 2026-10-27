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
      className="space-y-5 bg-white p-6"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "on" : "off"} />

      <div className="flex items-center gap-3 bg-brand-navy px-4 py-3 text-white">
        <Avatar src={preview} name={nicknameDefault || tenantName} size="md" />
        <h2 className="text-xl font-extrabold text-white">{tenantName}</h2>
      </div>

      <div>
        <label
          htmlFor={`nickname-${membershipId}`}
          className="block text-sm font-bold text-brand-navy"
        >
          俱樂部顯示暱稱
        </label>
        <input
          id={`nickname-${membershipId}`}
          name="nickname"
          defaultValue={nicknameDefault}
          placeholder={loginFallbackName}
          className="mt-1.5 w-full bg-[var(--bg)] px-4 py-3 text-base font-semibold text-brand-navy outline-none focus:outline-2 focus:outline-brand-teal"
        />
      </div>

      <div>
        <span className="block text-sm font-bold text-brand-navy">專屬頭像</span>
        <div className="mt-2 flex flex-wrap items-center gap-4 bg-[var(--bg)] p-4">
          <Avatar src={preview} name={nicknameDefault || tenantName} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <input
              ref={fileRef}
              id={`avatar-file-${membershipId}`}
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="block w-full text-sm text-[var(--muted)] file:mr-3 file:border-0 file:bg-brand-navy file:px-3.5 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-brand-teal"
            />
            <p className="text-xs text-[var(--muted)]">支援 JPG / PNG / WebP，最大 512 KB</p>
            {preview && (
              <button
                type="button"
                onClick={clearCustomAvatar}
                className="text-xs font-bold text-rose-800 underline hover:text-rose-950"
              >
                移除自訂頭像
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn-brand px-5 py-2.5 text-sm font-extrabold text-white"
      >
        儲存名片設定
      </button>
    </form>
  );
}
