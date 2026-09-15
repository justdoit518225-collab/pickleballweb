export type ContactSenderKind = "VISITOR" | "ADMIN";
export type ContactThreadStatus = "OPEN" | "CLOSED";

export type ContactMessageDto = {
  id: string;
  body: string;
  senderKind: ContactSenderKind;
  createdAt: string;
};

export type ContactInboxThreadDto = {
  id: string;
  who: string;
  preview: string | null;
  lastFromAdmin: boolean;
  status: ContactThreadStatus;
  adminUnread: number;
  lastMessageAt: string;
};

export function formatContactTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("zh-TW", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
