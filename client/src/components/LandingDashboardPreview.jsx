import { useNavigate } from "react-router-dom";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

/* ─── Skeleton shown while fetching ─────────────────────────────── */
function SkeletonCard() {
  const bar = (w, h = 12, mb = 0) => (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "linear-gradient(90deg, #ede9e1 0%, #e2ddd6 50%, #ede9e1 100%)",
      backgroundSize: "400px 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
      marginBottom: mb,
    }} />
  );
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 24,
      boxShadow: "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)",
      border: "1px solid rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bar("80px", 10)}
          {bar("130px", 16)}
        </div>
        {bar("60px", 24, 0)}
      </div>
      <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.04)" }}>
        {bar("100%", 10, 8)}
        {bar("100%", 7, 6)}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {bar("60px", 9)} {bar("60px", 9)}
        </div>
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 9, background: "#f9fafb", marginBottom: 7 }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e5e7eb" }} />
            {bar("90px", 10)}
          </div>
          {bar("50px", 20)}
        </div>
      ))}
      <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.15)", marginTop: 14 }}>
        {bar("70%", 10)}
      </div>
    </div>
  );
}

/* ─── Empty state — logged in but no circles yet ─────────────────── */
function EmptyCard() {
  const navigate = useNavigate();
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: "36px 24px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)",
      border: "1px solid rgba(0,0,0,0.05)",
      textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
        background: "rgba(212,160,23,0.09)", border: "1px solid rgba(212,160,23,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--ct-gold)", fontSize: 24,
      }}>
        ◎
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
        No circles yet
      </div>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 24, maxWidth: 260, margin: "0 auto 24px" }}>
        Create your first savings circle and your live dashboard will appear here.
      </p>
      <button
        onClick={() => navigate("/dashboard")}
        className="btn-gold"
        style={{ width: "100%", justifyContent: "center", borderRadius: 12, padding: "12px" }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

/* ─── Static demo card — shown to unauthenticated visitors ──────── */
const demoMembers = [
  { name: "Ismail A.",  status: "Verified", statusColor: "#059669", statusBg: "rgba(5,150,105,0.1)" },
  { name: "Emeka D.",   status: "Verified", statusColor: "#059669", statusBg: "rgba(5,150,105,0.1)" },
  { name: "Fatima A.",  status: "Pending",  statusColor: "#d97706", statusBg: "rgba(217,119,6,0.1)" },
  { name: "Abba B.",    status: "Late",     statusColor: "#e11d48", statusBg: "rgba(225,29,72,0.1)" },
];

function DemoCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 24,
      boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.05)",
    }}>
      <CardHeader name="Family Ajo Circle" monthLabel="August 2025" isActive />
      <CollectionProgress collected={240000} goal={300000} />
      <MemberList members={demoMembers} />
      <NextPayoutBadge label="Next payout: Chisom A." sub="In 8 days" />
    </div>
  );
}

/* ─── Live card — shows real group data ─────────────────────────── */
export function LiveCard({ activeGroup, liveContribs, livePayouts }) {
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const totalMembers = activeGroup.members.length;
  const amountPerMember = activeGroup.contributionAmount || 0;
  const goal = totalMembers * amountPerMember;

  // Tally verified contributions
  const verifiedContribs = liveContribs.filter(c => c.status === "verified");
  const collectedAmount = verifiedContribs.length * amountPerMember;
  const progressPct = totalMembers > 0 ? Math.round((verifiedContribs.length / totalMembers) * 100) : 0;

  // Map status for up to 4 members
  const memberRows = activeGroup.members.slice(0, 4).map(m => {
    const userId = m.user?._id || m.user;
    const contrib = liveContribs.find(c => {
      const cUserId = c.user?._id || c.user;
      return String(cUserId) === String(userId);
    });
    let status, statusColor, statusBg;
    if (!contrib) {
      status = "Not paid"; statusColor = "#e11d48"; statusBg = "rgba(225,29,72,0.1)";
    } else if (contrib.status === "verified") {
      status = "Verified"; statusColor = "#059669"; statusBg = "rgba(5,150,105,0.1)";
    } else if (contrib.status === "pending") {
      status = "Pending"; statusColor = "#d97706"; statusBg = "rgba(217,119,6,0.1)";
    } else {
      status = "Rejected"; statusColor = "#e11d48"; statusBg = "rgba(225,29,72,0.1)";
    }
    return { name: m.user?.name || "Member", status, statusColor, statusBg };
  });

  // Next upcoming (scheduled) payout on or after current month
  const nextPayout = livePayouts
    .filter(p => p.status === "scheduled" && p.month >= currentMonth)
    .sort((a, b) => a.month - b.month)[0];

  const nextPayoutLabel = nextPayout
    ? `Next payout: ${nextPayout.recipient?.name || "—"}`
    : "No payout scheduled";

  const nextPayoutSub = nextPayout
    ? MONTH_NAMES[nextPayout.month - 1]
    : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 24,
      boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.05)",
    }}>
      <CardHeader
        name={activeGroup.name}
        monthLabel={`${monthName} ${year}`}
        isActive={activeGroup.isActive}
      />
      <CollectionProgress
        collected={collectedAmount}
        goal={goal}
        progressPct={progressPct}
        totalMembers={totalMembers}
        paidCount={verifiedContribs.length}
      />
      <MemberList members={memberRows} totalCount={totalMembers} />
      <NextPayoutBadge label={nextPayoutLabel} sub={nextPayoutSub} />
    </div>
  );
}

/* ─── Shared sub-pieces ─────────────────────────────────────────── */

function CardHeader({ name, monthLabel, isActive }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {name}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#111827", letterSpacing: "-0.01em" }}>
          {monthLabel}
        </div>
      </div>
      <span style={{
        padding: "4px 10px", borderRadius: 20,
        background: isActive ? "rgba(5,150,105,0.1)" : "rgba(156,163,175,0.15)",
        color: isActive ? "#059669" : "#6b7280",
        fontSize: 11, fontWeight: 700,
      }}>
        {isActive ? "● Active" : "● Inactive"}
      </span>
    </div>
  );
}

function CollectionProgress({ collected, goal, progressPct, totalMembers, paidCount }) {
  const pct = progressPct !== undefined
    ? progressPct
    : goal > 0 ? Math.round((collected / goal) * 100) : 0;

  return (
    <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Monthly Collection</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#059669" }}>
          {fmt(collected)}
        </span>
      </div>
      <div style={{ height: 7, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`,
          background: "linear-gradient(90deg, #059669, #10b981)",
          borderRadius: 4, transition: "width 0.8s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          {paidCount !== undefined ? `${paidCount}/${totalMembers} paid` : `${pct}% complete`}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Goal: {fmt(goal)}</span>
      </div>
    </div>
  );
}

function MemberList({ members, totalCount }) {
  const extra = totalCount != null && totalCount > 4 ? totalCount - 4 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
        Members {totalCount != null ? `(${totalCount})` : ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 9, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: m.statusBg, color: m.statusColor,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{m.name}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: m.statusColor, background: m.statusBg, padding: "3px 9px", borderRadius: 10 }}>
              {m.status}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "4px 0" }}>
            +{extra} more member{extra > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function NextPayoutBadge({ label, sub }) {
  return (
    <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(212,160,23,0.07)", border: "1px solid rgba(212,160,23,0.22)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--ct-gold)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          </svg>
          <span style={{ fontSize: 12, color: "#92700f", fontWeight: 600 }}>{label}</span>
        </div>
        {sub && (
          <span style={{ fontSize: 11, color: "var(--ct-gold)", fontWeight: 700 }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Main export: picks which card to render ────────────────────── */
export default function LandingDashboardPreview({ user, activeGroup, loadingGroups, liveContribs, livePayouts, liveLoading }) {
  const isLoading = loadingGroups || liveLoading;

  return (
    <div className="dashboard-float" style={{ position: "relative", width: "100%", maxWidth: 380 }}>
      {/* Main card */}
      {!user ? (
        <DemoCard />
      ) : isLoading && liveContribs === null ? (
        <SkeletonCard />
      ) : user && activeGroup && liveContribs !== null ? (
        <LiveCard activeGroup={activeGroup} liveContribs={liveContribs} livePayouts={livePayouts} />
      ) : user && !loadingGroups && !activeGroup ? (
        <EmptyCard />
      ) : (
        <DemoCard />
      )}

      {/* Floating badge — top right */}
      <div style={{
        position: "absolute", top: -18, right: -18,
        background: "var(--ct-sidebar)", borderRadius: 12,
        padding: "10px 14px", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: user && activeGroup ? "var(--ct-gold)" : "#10b981",
          animation: "pulse-ring 2s infinite",
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: user && activeGroup ? "var(--ct-gold)" : "#10b981" }}>
          {user && activeGroup ? "Live data" : "Live • Demo"}
        </span>
      </div>

      {/* Floating badge — bottom left */}
      <div style={{
        position: "absolute", bottom: -16, left: -16,
        background: "#fff", borderRadius: 12,
        padding: "10px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
          {user && activeGroup ? "Verified payments" : "Proof verified"}
        </span>
      </div>
    </div>
  );
}
