import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BookingActions } from "@/components/activity/booking-actions";
import { Badge } from "@/components/ui/badge";
import { ParticipantList } from "@/components/participant-list";
import { maxSelectablePartySize, sumPartySize } from "@/lib/activity-capacity";
import {
  buildBookingListMeta,
  formatPartyHeadLabel,
} from "@/lib/booking-display";
import { formatActivityDateTime, formatActivityTime } from "@/lib/format-datetime";
import { canCancelBooking, formatCancelPolicy } from "@/lib/booking";
import { resolveMemberDisplay } from "@/lib/member-display";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { activityKindBadgeVariant, adminActivityKindLabel, ROUTES } from "@/lib/constants";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const session = await auth();

  const activity = await prisma.activity.findFirst({
    where: { id, tenantId: tenant.id, status: "PUBLISHED" },
    include: {
      venue: true,
      court: true,
      bookings: {
        where: { status: "CONFIRMED" },
        include: { user: true },
      },
    },
  });

  if (!activity) notFound();

  const waitlistEntry =
    session?.user &&
    (await prisma.waitlistEntry.findUnique({
      where: { activityId_userId: { activityId: id, userId: session.user.id } },
    }));

  const membershipByUser = await prisma.tenantMembership.findMany({
    where: {
      tenantId: tenant.id,
      userId: { in: activity.bookings.map((b) => b.userId) },
    },
  });

  const membershipMap = new Map(membershipByUser.map((m) => [m.userId, m]));

  const confirmedHeads = sumPartySize(activity.bookings);

  const participants = activity.bookings.map((b) => {
    const display = resolveMemberDisplay(b.user, membershipMap.get(b.userId));
    return {
      ...display,
      displayName: formatPartyHeadLabel(b.partySize, display.displayName),
      meta: buildBookingListMeta(b),
      isSelf: session?.user?.id === b.userId,
    };
  });

  const userBooking = session?.user
    ? await prisma.booking.findUnique({
        where: { activityId_userId: { activityId: id, userId: session.user.id } },
      })
    : null;

  const hasJoined = userBooking?.status === "CONFIRMED";
  const isFull = confirmedHeads >= activity.capacity;
  const canCancel = hasJoined && canCancelBooking(activity);
  const onWaitlist = waitlistEntry?.status === "WAITING";
  const allowPartySize =
    activity.type === "OPEN_PLAY" && !activity.requiresDupr && !hasJoined;
  const maxPartySize = allowPartySize
    ? maxSelectablePartySize(activity.capacity, confirmedHeads)
    : 1;

  const duprProfile =
    session?.user && activity.requiresDupr
      ? await prisma.duprProfile.findUnique({ where: { userId: session.user.id } })
      : null;

  return (
    <div>
      <section className="bg-brand-navy py-10 text-white sm:py-12">
        <div className="page-wrap">
          <Link
            href={ROUTES.tenantActivities(tenantSlug)}
            className="text-xs font-bold text-brand-lime hover:underline"
          >
            ← 返回 {tenant.displayName} 活動列表
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge variant={activityKindBadgeVariant(activity.type, activity.requiresDupr)}>
              {adminActivityKindLabel(activity.type, activity.requiresDupr)}
            </Badge>
            <span className="text-xs font-bold text-white/80 tabular-nums">
              名額 {confirmedHeads} / {activity.capacity} 人
            </span>
          </div>
          <h1 className="type-head mt-3 text-white">{activity.title}</h1>
          <p className="mt-3 text-base font-semibold text-brand-lime tabular-nums">
            {formatActivityDateTime(activity.startAt)} — {formatActivityTime(activity.endAt)}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {activity.venue.name}
            {activity.court ? ` · ${activity.court.name}` : ""}
          </p>
        </div>
      </section>

      <div className="page-wrap py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            {activity.description && (
              <div className="bg-[var(--surface)] p-6">
                <h2 className="text-sm font-extrabold text-brand-navy">活動說明</h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-brand-navy">
                  {activity.description}
                </p>
              </div>
            )}

            <div className="bg-[var(--surface-alt)] px-5 py-4 text-sm font-semibold text-brand-navy">
              取消規則：{formatCancelPolicy(activity)}
            </div>

            {activity.requiresDupr && (
              <div className="border-l-4 border-brand-teal bg-brand-teal-soft px-5 py-4 text-sm font-bold text-brand-navy">
                {duprProfile?.linkStatus === "LINKED" ? (
                  <>
                    已帶入 DUPR：{duprProfile.duprName}（單打{" "}
                    {duprProfile.singlesRating?.toString() ?? "—"} / 雙打{" "}
                    {duprProfile.doublesRating?.toString() ?? "—"}）
                  </>
                ) : (
                  <>
                    DUPR 專場：請先{" "}
                    <Link href="/me/dupr" className="text-brand-teal underline">
                      連結 DUPR 積分帳號
                    </Link>{" "}
                    再預約
                  </>
                )}
              </div>
            )}

            <div>
              {!session?.user ? (
                <Link href="/login" className="btn-brand">
                  登入會員後立即預約 →
                </Link>
              ) : (
                <BookingActions
                  activityId={activity.id}
                  hasJoined={hasJoined}
                  isFull={isFull}
                  canCancel={canCancel}
                  onWaitlist={onWaitlist}
                  waitlistPosition={waitlistEntry?.position}
                  allowPartySize={allowPartySize}
                  maxPartySize={maxPartySize}
                  joinedPartySize={userBooking?.partySize ?? 1}
                  activityStartAt={activity.startAt.toISOString()}
                  activityEndAt={activity.endAt.toISOString()}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <ParticipantList
              participants={participants}
              capacity={activity.capacity}
              headCount={confirmedHeads}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
