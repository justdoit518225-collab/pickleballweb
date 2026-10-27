import {
  adminAddBooking,
  adminAssignRental,
  adminCancelBooking,
  adminCancelRental,
  adminCreateSlot,
  adminMoveBooking,
  adminUpdateBooking,
} from "@/app/admin/[tenantSlug]/board/actions";
import type {
  AdminCourtSection,
  AdminDropIn,
  AdminRental,
  MemberOption,
  MoveTarget,
} from "@/lib/admin-board";

type Common = {
  tenantSlug: string;
  date: string;
  members: MemberOption[];
  moveTargets: MoveTarget[];
};

const inputCls =
  "bg-white px-3 py-1.5 text-[14px] text-brand-navy";
const btnCls =
  "bg-brand-navy px-3 py-1.5 text-[14px] font-black text-white hover:bg-brand-lime hover:text-brand-navy";
const subtleBtn =
  "bg-white px-3 py-1.5 text-[14px] font-bold text-brand-navy hover:bg-[var(--surface-alt)]";

function HiddenCtx({ tenantSlug, date }: { tenantSlug: string; date: string }) {
  return (
    <>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="date" value={date} />
    </>
  );
}

function MemberOrWalkin({ members }: { members: MemberOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select name="memberUserId" className={inputCls} defaultValue="">
        <option value="">— 選會員 —</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>
      <span className="text-[14px] text-[var(--muted)]">或</span>
      <input
        type="text"
        name="walkinName"
        placeholder="臨打/承租姓名"
        className={inputCls}
      />
    </div>
  );
}

function BookingRow({
  booking,
  activity,
  ctx,
}: {
  booking: AdminDropIn["bookings"][number];
  activity: AdminDropIn;
  ctx: Common;
}) {
  return (
    <li className="bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] text-brand-navy">
          <span className="font-bold">
            {booking.displayName}
            {booking.partySize > 1 ? ` +${booking.partySize - 1}` : ""}
          </span>
          <span className="ml-2 text-[var(--muted)]">
            {booking.startTime}-{booking.endTime}
            {booking.racketRental > 0 ? ` · 球拍×${booking.racketRental}` : ""}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <form action={adminCancelBooking}>
            <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
            <input type="hidden" name="bookingId" value={booking.bookingId} />
            <button type="submit" className={subtleBtn}>
              取消
            </button>
          </form>
        </div>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[14px] font-bold text-[#1B6B73]">編輯 / 換場</summary>
        <div className="mt-2 space-y-2">
          <form action={adminUpdateBooking} className="flex flex-wrap items-end gap-2">
            <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
            <input type="hidden" name="bookingId" value={booking.bookingId} />
            <label className="text-[14px] text-[var(--muted)]">
              人數
              <input
                type="number"
                name="partySize"
                min={1}
                defaultValue={booking.partySize}
                className={`${inputCls} ml-1 w-16`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              起
              <input
                type="time"
                name="startTime"
                defaultValue={booking.startTime}
                className={`${inputCls} ml-1`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              迄
              <input
                type="time"
                name="endTime"
                defaultValue={booking.endTime}
                className={`${inputCls} ml-1`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              球拍
              <input
                type="number"
                name="racketRental"
                min={0}
                defaultValue={booking.racketRental}
                className={`${inputCls} ml-1 w-16`}
              />
            </label>
            <button type="submit" className={btnCls}>
              儲存
            </button>
          </form>

          <form action={adminMoveBooking} className="flex flex-wrap items-end gap-2">
            <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
            <input type="hidden" name="bookingId" value={booking.bookingId} />
            <label className="text-[14px] text-[var(--muted)]">
              換到
              <select
                name="targetActivityId"
                className={`${inputCls} ml-1`}
                defaultValue={activity.activityId}
              >
                {ctx.moveTargets.map((t) => (
                  <option key={t.activityId} value={t.activityId}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={subtleBtn}>
              換場/時段
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}

function DropInCard({ block, ctx }: { block: AdminDropIn; ctx: Common }) {
  return (
    <div className="bg-[var(--bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[16px] font-black text-brand-navy">
          臨打 · {block.windowLabel}
          {block.title && block.title !== "球敘" ? ` · ${block.title}` : ""}
        </p>
        <span className="font-mono text-[14px] font-bold text-brand-navy">
          {block.headCount}/{block.capacity} 人
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {block.bookings.length === 0 ? (
          <li className="text-[14px] text-[var(--muted)]">尚無報名</li>
        ) : (
          block.bookings.map((b) => (
            <BookingRow key={b.bookingId} booking={b} activity={block} ctx={ctx} />
          ))
        )}
      </ul>

      <details className="mt-3">
        <summary className="cursor-pointer text-[14px] font-black text-brand-navy">
          ＋ 代客新增報名
        </summary>
        <form action={adminAddBooking} className="mt-2 space-y-2">
          <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
          <input type="hidden" name="activityId" value={block.activityId} />
          <MemberOrWalkin members={ctx.members} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[14px] text-[var(--muted)]">
              人數
              <input
                type="number"
                name="partySize"
                min={1}
                defaultValue={1}
                className={`${inputCls} ml-1 w-16`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              起
              <input
                type="time"
                name="startTime"
                defaultValue={block.startTime}
                className={`${inputCls} ml-1`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              迄
              <input
                type="time"
                name="endTime"
                defaultValue={block.endTime}
                className={`${inputCls} ml-1`}
              />
            </label>
            <label className="text-[14px] text-[var(--muted)]">
              球拍
              <input
                type="number"
                name="racketRental"
                min={0}
                defaultValue={0}
                className={`${inputCls} ml-1 w-16`}
              />
            </label>
            <button type="submit" className={btnCls}>
              新增
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function RentalCard({ block, ctx }: { block: AdminRental; ctx: Common }) {
  return (
    <div className="bg-[var(--bg)] p-4">
      <p className="text-[16px] font-black text-brand-navy">租場 · {block.windowLabel}</p>
      {block.status === "BOOKED" ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-bold text-brand-navy">
            {block.renterName ?? "已租借"}
            {block.racketRental > 0 ? ` · 球拍×${block.racketRental}` : ""}
          </span>
          <form action={adminCancelRental}>
            <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
            <input type="hidden" name="slotId" value={block.slotId} />
            <button type="submit" className={subtleBtn}>
              釋出 / 取消租借
            </button>
          </form>
        </div>
      ) : (
        <details className="mt-2">
          <summary className="cursor-pointer text-[14px] font-black text-brand-navy">
            ＋ 代客指定承租
          </summary>
          <form action={adminAssignRental} className="mt-2 space-y-2">
            <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
            <input type="hidden" name="slotId" value={block.slotId} />
            <MemberOrWalkin members={ctx.members} />
            <label className="text-[14px] text-[var(--muted)]">
              球拍
              <input
                type="number"
                name="racketRental"
                min={0}
                defaultValue={0}
                className={`${inputCls} ml-1 w-16`}
              />
            </label>
            <div>
              <button type="submit" className={btnCls}>
                指定承租
              </button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}

function CreateSlotForm({
  court,
  ctx,
}: {
  court: AdminCourtSection;
  ctx: Common;
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[14px] font-black text-brand-navy">
        ＋ 開放新時段
      </summary>
      <form action={adminCreateSlot} className="mt-2 flex flex-wrap items-end gap-2">
        <HiddenCtx tenantSlug={ctx.tenantSlug} date={ctx.date} />
        <input type="hidden" name="courtId" value={court.courtId} />
        <input type="hidden" name="venueId" value={court.venueId} />
        <label className="text-[14px] text-[var(--muted)]">
          類型
          <select name="kind" className={`${inputCls} ml-1`} defaultValue="open-play">
            <option value="open-play">臨打</option>
            <option value="rental">租場</option>
          </select>
        </label>
        <label className="text-[14px] text-[var(--muted)]">
          起
          <input type="time" name="startTime" className={`${inputCls} ml-1`} />
        </label>
        <label className="text-[14px] text-[var(--muted)]">
          迄
          <input type="time" name="endTime" className={`${inputCls} ml-1`} />
        </label>
        <label className="text-[14px] text-[var(--muted)]">
          臨打容量
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={4}
            className={`${inputCls} ml-1 w-16`}
          />
        </label>
        <input
          type="text"
          name="title"
          placeholder="臨打名稱（選填）"
          className={inputCls}
        />
        <button type="submit" className={btnCls}>
          建立
        </button>
      </form>
    </details>
  );
}

export function AdminBoardView({
  tenantSlug,
  date,
  dateLabel,
  courts,
  members,
  moveTargets,
}: {
  tenantSlug: string;
  date: string;
  dateLabel: string;
  courts: AdminCourtSection[];
  members: MemberOption[];
  moveTargets: MoveTarget[];
}) {
  const ctx: Common = { tenantSlug, date, members, moveTargets };

  return (
    <div className="space-y-6">
      <header className="bg-white p-6">
        <p className="text-[14px] font-bold text-[#1B6B73]">{dateLabel}</p>
        <h2 className="mt-1 text-[24px] font-black text-brand-navy">當日看板（管理）</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          可開放時段、代客報名／承租、修改或取消用戶報名。
        </p>
      </header>

      {courts.length === 0 ? (
        <p className="bg-white p-6 text-center text-[14px] text-[var(--muted)]">
          尚無球場，請先於「場館／球場」建立。
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courts.map((court) => (
            <section
              key={court.courtId}
              className="overflow-hidden bg-white"
            >
              <div className="bg-brand-navy px-5 py-4">
                <h3 className="text-[20px] font-black text-white">{court.courtName}</h3>
                <p className="text-[14px] text-[#C8D8E4]">{court.venueName}</p>
              </div>
              <div className="space-y-3 p-5">
                {court.blocks.length === 0 ? (
                  <p className="text-[14px] text-[var(--muted)]">本日無時段</p>
                ) : (
                  court.blocks.map((block) =>
                    block.kind === "drop-in" ? (
                      <DropInCard key={block.activityId} block={block} ctx={ctx} />
                    ) : (
                      <RentalCard key={block.slotId} block={block} ctx={ctx} />
                    ),
                  )
                )}
                <CreateSlotForm court={court} ctx={ctx} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
