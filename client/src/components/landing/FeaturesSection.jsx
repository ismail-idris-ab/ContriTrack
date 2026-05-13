import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TOOLTIP_DEFS = {
  Circles:
    "A Circle is one contribution group (e.g. your family Ajo or office thrift). You can manage multiple separate Circles in one account.",
  Pledge:
    "A Pledge lets a member voluntarily commit extra funds or request an early payout before their scheduled turn. Admin approves or rejects.",
  Penalties:
    "Penalties are automatic fines applied when a member misses their contribution deadline. The amount is added to the group pot.",
};

const keyFeatures = [
  {
    title: "Full Transparency Dashboard",
    tooltip: null,
    body: "See total collected, who has paid, who is pending, and upcoming payouts at a glance.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: "Verified Proof & Receipt Upload",
    tooltip: null,
    body: "Members upload bank transfer receipts or screenshots. You review and verify — permanent record for everyone.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Circles",
    tooltip: "Circles",
    body: "Manage different contribution schemes (family, office, church, friends) separately in one app.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    ),
  },
  {
    title: "Members Management",
    tooltip: null,
    body: "Easy add/edit, invite via code, view individual payment history and streaks.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Pledge System",
    tooltip: "Pledge",
    body: "Members can pledge extra amounts or request early payout. You approve with full control.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    title: "Smart Penalties",
    tooltip: "Penalties",
    body: "Set rules (e.g. ₦500 fine after the 5th). Apply automatically or manually — penalties add to the group pot for fairness.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: "Payout & Rotation",
    tooltip: null,
    body: "Clearly see whose turn it is. Record payouts with one click and keep the rotation fair.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    title: "Powerful Reports",
    tooltip: null,
    body: "Generate monthly or yearly summaries. Export to PDF or CSV for meetings, banks, or records.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    title: "Payment History Timeline",
    tooltip: null,
    body: "Every member can view their own complete contribution record anytime.",
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const beforeItems = [
  'Endless "Have you paid?" messages on WhatsApp',
  "Excel sheets that nobody trusts",
  '"I paid already!" arguments with no proof',
  "Hours wasted every month chasing late payments",
  "Confusion about whose turn it is for payout",
];

const afterItems = [
  "One clean dashboard everyone can see",
  "Verified payment proofs (receipt uploads)",
  "Automatic penalties for late contributors",
  'Clear payout rotation and "who\'s next"',
  "Professional reports you can export and share",
];

export default function FeaturesSection({ navigate: navigateProp, user }) {
  const navigateHook = useNavigate();
  const { user: authUser } = useAuth();
  const navigate = navigateProp || navigateHook;
  const currentUser = user !== undefined ? user : authUser;
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [members, setMembers] = useState(12);
  const [contribution, setContribution] = useState(10000);

  const monthlyPot = members * contribution;
  const yearlyTotal = monthlyPot * 12;
  const fmt = (n) => "₦" + n.toLocaleString("en-NG");

  return (
    <>
      {/* ── FEATURE SHOWCASE ──────────────────────────────────── */}
      <section
        className="showcase-section"
        style={{
          background: "var(--ct-page)",
          padding: "96px 64px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 64px" }}
        >
          <span className="section-tag">Why ROTARA</span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 700,
              color: "var(--ct-text-1)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Don't manage your Ajo manually. Automate it.
          </h2>
        </div>

        <div
          className="showcase-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            maxWidth: 1100,
            margin: "0 auto 24px",
          }}
        >
          {/* Card 1 — Dashboard */}
          <div
            className="showcase-card"
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "var(--ct-sidebar)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ padding: "36px 36px 0" }}>
              <span className="section-tag">Full Transparency</span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#f5f2ec",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  marginBottom: 14,
                }}
              >
                Your circle's live ledger, visible to everyone.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#7a7a96",
                  lineHeight: 1.75,
                  marginBottom: 28,
                }}
              >
                Every member sees the same real-time contribution record. No
                confusion, no arguments.
              </p>
            </div>
            {/* Mini UI */}
            <div
              style={{
                margin: "0 24px 0",
                borderRadius: "12px 12px 0 0",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
                borderBottom: "none",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#e11d48",
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#d97706",
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#059669",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "#5a5a78",
                    marginLeft: 8,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Adashe for — August
                </span>
              </div>
              <div style={{ padding: "16px" }}>
                {[
                  {
                    name: "Ismail A.",
                    amount: "₦20,000",
                    status: "Verified",
                    color: "#059669",
                    bg: "rgba(5,150,105,0.15)",
                  },
                  {
                    name: "Emeka D.",
                    amount: "₦20,000",
                    status: "Verified",
                    color: "#059669",
                    bg: "rgba(5,150,105,0.15)",
                  },
                  {
                    name: "Aiyu Y.",
                    amount: "—",
                    status: "Pending",
                    color: "#d97706",
                    bg: "rgba(217,119,6,0.15)",
                  },
                  {
                    name: "Tunde B.",
                    amount: "—",
                    status: "Late",
                    color: "#e11d48",
                    bg: "rgba(225,29,72,0.15)",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 10px",
                      borderRadius: 8,
                      background:
                        i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        color: "#c8c8d8",
                        fontWeight: 500,
                      }}
                    >
                      {row.name}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "#9898b4",
                        }}
                      >
                        {row.amount}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: row.color,
                          background: row.bg,
                          padding: "2px 8px",
                          borderRadius: 8,
                        }}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2 — Smart Penalties */}
          <div
            className="showcase-card"
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "#fffdf7",
              border: "1px solid rgba(212,160,23,0.15)",
              boxShadow: "0 8px 32px rgba(212,160,23,0.07)",
            }}
          >
            <div style={{ padding: "36px 36px 0" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ct-gold)",
                  marginBottom: 12,
                  display: "block",
                }}
              >
                Smart Automation
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "var(--ct-text-1)",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  marginBottom: 14,
                }}
              >
                Penalties, reminders, and payouts — handled.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ct-text-2)",
                  lineHeight: 1.75,
                  marginBottom: 28,
                }}
              >
                Set rules once. ROTARA tracks deadlines, applies penalties
                automatically, and flags missed payments.
              </p>
            </div>
            {/* Mini UI */}
            <div
              style={{
                margin: "0 24px 0",
                borderRadius: "12px 12px 0 0",
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,0.06)",
                borderBottom: "none",
                background: "#fff",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}
                >
                  Penalty Rules
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#059669",
                    fontWeight: 700,
                    background: "rgba(5,150,105,0.1)",
                    padding: "2px 8px",
                    borderRadius: 8,
                  }}
                >
                  Active
                </span>
              </div>
              {[
                { label: "Late payment fine", value: "₦500", on: true },
                { label: "Auto-apply after day 5", value: null, on: true },
                { label: "WhatsApp reminders", value: null, on: false },
                { label: "Add to group pot", value: null, on: true },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  }}
                >
                  <span
                    style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    {item.value && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--ct-gold)",
                        }}
                      >
                        {item.value}
                      </span>
                    )}
                    <div
                      style={{
                        width: 32,
                        height: 18,
                        borderRadius: 9,
                        background: item.on ? "var(--ct-gold)" : "#d1d5db",
                        position: "relative",
                        cursor: "default",
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "#fff",
                          top: 2,
                          left: item.on ? 16 : 2,
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY FEATURES GRID ─────────────────────────────────── */}
      <section
        id="features"
        className="features-section"
        style={{
          background: "var(--ct-page)",
          padding: "0 64px 96px",
          borderTop: "none",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}
        >
          <h2
            className="features-h2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--ct-text-1)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Everything built for Ajo accountability.
          </h2>
        </div>
        <div
          className="features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {keyFeatures.map((f, i) => (
            <div
              key={i}
              className="animate-fade-up feature-card"
              style={{
                padding: "26px",
                borderRadius: 14,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                animationDelay: `${0.05 * i}s`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  background: "var(--ct-gold-bg)",
                  border: "1px solid var(--ct-gold-dim)",
                  color: "var(--ct-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--ct-text-1)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </span>
                {f.tooltip && (
                  <div
                    className="tooltip-wrap"
                    onMouseEnter={() => setActiveTooltip(f.tooltip)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.06)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "help",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--ct-text-3)",
                      }}
                    >
                      ?
                    </div>
                    {activeTooltip === f.tooltip && (
                      <div className="tooltip-box">
                        {TOOLTIP_DEFS[f.tooltip]}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--ct-text-2)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM / BEFORE-AFTER ────────────────────────────── */}
      <section
        className="problem-section"
        style={{
          background: "var(--ct-sidebar)",
          padding: "96px 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.025,
            backgroundImage:
              "radial-gradient(circle, #d4a017 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto 64px",
            position: "relative",
          }}
        >
          <span className="section-tag">The ROTARA Difference</span>
          <h2
            className="problem-h2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 700,
              color: "#f5f2ec",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            From group chat chaos to real accountability.
          </h2>
        </div>
        <div
          className="problem-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            maxWidth: 960,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Before */}
          <div
            style={{
              padding: "32px",
              borderRadius: 18,
              background: "rgba(225,29,72,0.04)",
              border: "1px solid rgba(225,29,72,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#e11d48",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#e11d48",
                }}
              >
                Before ROTARA
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {beforeItems.map((item, i) => (
                <div
                  key={i}
                  className="animate-fade-up"
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    animationDelay: `${0.06 * i}s`,
                  }}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    style={{ flexShrink: 0, marginTop: 3 }}
                    aria-hidden="true"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  <span
                    style={{ fontSize: 14, color: "#9898b4", lineHeight: 1.6 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* After */}
          <div
            style={{
              padding: "32px",
              borderRadius: 18,
              background: "var(--ct-gold-bg)",
              border: "1px solid var(--ct-gold-dim)",
              boxShadow: "0 8px 32px rgba(212,160,23,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--ct-gold)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ct-gold)",
                }}
              >
                With ROTARA
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {afterItems.map((item, i) => (
                <div
                  key={i}
                  className="animate-fade-up"
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    animationDelay: `${0.06 * i}s`,
                  }}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ct-emerald)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 3 }}
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                  <span
                    style={{ fontSize: 14, color: "#c8c8d8", lineHeight: 1.6 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{ textAlign: "center", marginTop: 52, position: "relative" }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: "var(--ct-gold)",
              margin: "0 auto 20px",
              borderRadius: 2,
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontStyle: "italic",
              color: "#9898b4",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Result: More trust, less drama, and more time for you.
          </p>
        </div>
      </section>

      {/* ── CALCULATOR ────────────────────────────────────────── */}
      <section
        className="calc-section"
        style={{
          background: "var(--ct-page)",
          padding: "80px 64px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-tag">Contribution calculator</span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 700,
                color: "var(--ct-text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              See your circle's potential
            </h2>
          </div>
          <div
            className="calc-card"
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "40px 48px",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
            }}
          >
            <div className="calc-inner" style={{ display: "flex", gap: 48 }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 36,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ct-text-1)",
                      }}
                    >
                      Number of members
                    </label>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--ct-gold)",
                      }}
                    >
                      {members}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={50}
                    value={members}
                    onChange={(e) => setMembers(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, var(--ct-gold) 0%, var(--ct-gold) ${((members - 2) / 48) * 100}%, #e8e4da ${((members - 2) / 48) * 100}%, #e8e4da 100%)`,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--ct-text-3)" }}>
                      2
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ct-text-3)" }}>
                      50
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ct-text-1)",
                      }}
                    >
                      Monthly contribution per member
                    </label>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--ct-gold)",
                      }}
                    >
                      {fmt(contribution)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={100000}
                    step={500}
                    value={contribution}
                    onChange={(e) => setContribution(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, var(--ct-gold) 0%, var(--ct-gold) ${((contribution - 1000) / 99000) * 100}%, #e8e4da ${((contribution - 1000) / 99000) * 100}%, #e8e4da 100%)`,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--ct-text-3)" }}>
                      ₦1,000
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ct-text-3)" }}>
                      ₦100,000
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="calc-border"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  borderLeft: "1px solid rgba(0,0,0,0.06)",
                  paddingLeft: 48,
                  justifyContent: "center",
                  minWidth: 200,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--ct-text-3)",
                      marginBottom: 8,
                    }}
                  >
                    Monthly Pot
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 30,
                      fontWeight: 700,
                      color: "var(--ct-emerald)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {fmt(monthlyPot)}
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--ct-text-3)",
                      marginBottom: 8,
                    }}
                  >
                    Yearly Total
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 30,
                      fontWeight: 700,
                      color: "var(--ct-text-1)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {fmt(yearlyTotal)}
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 28,
                paddingTop: 24,
                borderTop: "1px solid rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ct-text-3)",
                  marginBottom: 20,
                }}
              >
                That's{" "}
                <span style={{ color: "var(--ct-emerald)", fontWeight: 700 }}>
                  {fmt(yearlyTotal)}
                </span>{" "}
                moving through your circle every year — ROTARA ensures
                every naira is accounted for.
              </p>
              <button
                onClick={() => navigate(currentUser ? "/dashboard" : "/register")}
                className="btn-gold btn-gold-pulse"
                style={{ padding: "14px 32px", fontSize: 15 }}
              >
                {currentUser
                  ? "Create Your Circle Now"
                  : "Start Tracking Your Circle — Free"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
