import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BookingActions } from "@/components/activity/booking-actions";
import { Badge } from "@/components/ui/badge";
import { ParticipantList } from "@/components/participant-list";
import { maxSelectablePartySize, sumPartySize } from "@/lib/activity-capacity";
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
    const name = display.displayName;
    return {
      ...display,
      displayName: b.partySize > 1 ? `${name}（${b.partySize} 人）` : name,
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={ROUTES.tenantActivities(tenantSlug)} className="text-sm text-emerald-600">
        ← 活動列表
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={activityKindBadgeVariant(activity.type, activity.requiresDupr)}>
            {adminActivityKindLabel(activity.type, activity.requiresDupr)}
          </Badge>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">{activity.title}</h1>
        <p className="mt-2 text-slate-600">
          {formatActivityDateTime(activity.startAt)} —{" "}
          {formatActivityTime(activity.endAt)}
        </p>
        <p className="text-slate-600">
          {activity.venue.name}
          {activity.court ? ` · ${activity.court.name}` : ""}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          名額 {confirmedHeads} / {activity.capacity}
        </p>
        {activity.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
            {activity.description}
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500">取消規則：{formatCancelPolicy(activity)}</p>
        {activity.requiresDupr && (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {duprProfile?.linkStatus === "LINKED" ? (
              <>
                已帶入 DUPR：{duprProfile.duprName}（單打{" "}
                {duprProfile.singlesRating?.toString() ?? "—"} / 雙打{" "}
                {duprProfile.doublesRating?.toString() ?? "—"}）
              </>
            ) : (
              <>
                DUPR 專場：請先{" "}
                <Link href="/me/dupr" className="underline">
                  連結 DUPR
                </Link>{" "}
                再預約
              </>
            )}
          </p>
        )}
      </header>

      <div className="mt-6">
        {!session?.user ? (
          <Link
            href="/login"
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            登入後預約
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
          />
        )}
      </div>

      {hasJoined && (
        <div className="mt-8">
          <ParticipantList
            participants={participants}
            capacity={activity.capacity}
            headCount={confirmedHeads}
          />
        </div>
      )}
    </div>
  );
}
