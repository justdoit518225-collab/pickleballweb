import { z } from "zod";

const activityBaseFields = {
  title: z.string().min(1, "請輸入標題").max(120),
  description: z.string().max(2000).optional(),
  type: z.enum(["OPEN_PLAY", "COURSE"]),
  venueId: z.string().min(1),
  courtId: z.string().optional(),
  capacity: z.coerce.number().int().min(1).max(200),
  cancelPolicyType: z.enum(["HOURS_BEFORE", "DEADLINE"]),
  cancelHoursBefore: z.coerce.number().int().min(0).optional(),
  cancelDeadlineAt: z.string().optional(),
  requiresDupr: z.coerce.boolean().optional(),
  duprEventName: z.string().max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
};

function refineCancelPolicy(
  data: {
    cancelPolicyType: "HOURS_BEFORE" | "DEADLINE";
    cancelHoursBefore?: number;
  },
  ctx: z.RefinementCtx,
) {
  if (data.cancelPolicyType === "HOURS_BEFORE" && data.cancelHoursBefore == null) {
    ctx.addIssue({
      code: "custom",
      message: "請填寫開始前幾小時內不可取消",
      path: ["cancelHoursBefore"],
    });
  }
}

export const activityBaseFormSchema = z.object(activityBaseFields).superRefine(refineCancelPolicy);

export const activityFormSchema = z
  .object({
    ...activityBaseFields,
    startAt: z.string().min(1),
    endAt: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (end <= start) {
      ctx.addIssue({ code: "custom", message: "結束時間需晚於開始時間", path: ["endAt"] });
    }
    refineCancelPolicy(data, ctx);
  });

export type ActivityBaseFormInput = z.infer<typeof activityBaseFormSchema>;
export type ActivityFormInput = z.infer<typeof activityFormSchema>;

export function readActivityBaseFields(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    venueId: formData.get("venueId"),
    courtId: formData.get("courtId") || undefined,
    capacity: formData.get("capacity"),
    cancelPolicyType: formData.get("cancelPolicyType"),
    cancelHoursBefore: formData.get("cancelHoursBefore") || undefined,
    cancelDeadlineAt: formData.get("cancelDeadlineAt") || undefined,
    requiresDupr: formData.get("requiresDupr") === "on",
    duprEventName: formData.get("duprEventName") || undefined,
    status: formData.get("status"),
  };
}

export function parseActivityForm(formData: FormData) {
  return activityFormSchema.parse({
    ...readActivityBaseFields(formData),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
}

export function normalizeActivityInput(data: ActivityFormInput): ActivityFormInput {
  if (data.cancelPolicyType === "DEADLINE" && !data.cancelDeadlineAt) {
    return { ...data, cancelDeadlineAt: data.startAt };
  }
  return data;
}

export function toActivityFormInput(
  base: ActivityBaseFormInput,
  startAt: string,
  endAt: string,
): ActivityFormInput {
  return normalizeActivityInput({ ...base, startAt, endAt });
}

export function toActivityData(parsed: ActivityFormInput, createdById?: string) {
  const cancelDeadlineAt =
    parsed.cancelPolicyType === "DEADLINE"
      ? parsed.cancelDeadlineAt || parsed.startAt
      : parsed.cancelDeadlineAt;

  return {
    title: parsed.title,
    description: parsed.description || null,
    type: parsed.type,
    venueId: parsed.venueId,
    courtId: parsed.courtId || null,
    startAt: new Date(parsed.startAt),
    endAt: new Date(parsed.endAt),
    capacity: parsed.capacity,
    cancelPolicyType: parsed.cancelPolicyType,
    cancelHoursBefore:
      parsed.cancelPolicyType === "HOURS_BEFORE" ? parsed.cancelHoursBefore! : null,
    cancelDeadlineAt:
      parsed.cancelPolicyType === "DEADLINE" && cancelDeadlineAt
        ? new Date(cancelDeadlineAt)
        : null,
    requiresDupr: parsed.requiresDupr ?? false,
    duprEventName: parsed.duprEventName || null,
    status: parsed.status,
    createdById: createdById ?? null,
  };
}
