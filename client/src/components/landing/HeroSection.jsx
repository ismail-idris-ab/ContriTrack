import { useGroup } from "../../context/GroupContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import api from "../../api/axios";
import LandingDashboardPreview from "../LandingDashboardPreview";

const heroFeatures = [
  {
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
        <circle cx="12" cy="10" r="3" />
        <path d="M6.168 18.849A4 4 0 0 1 10 17h4a4 4 0 0 1 3.834 2.855" />
      </svg>
    ),
    title: "Full Transparency",
    body: "Every member sees who has paid and can view proof — no more he-said-she-said arguments.",
  },
  {
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
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "Verified Proof",
    body: "Upload receipts or screenshots. Admins review and verify each submission before it counts.",
  },
  {
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
    title: "Group Management",
    body: "Invite members with a single code. Track everyone's monthly status in one clean dashboard.",
  },
  {
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
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Payment History",
    body: "A personal timeline of every contribution you've made — always accessible, always accurate.",
  },
];

const trustedOrgs = [
  { name: "GTBank", color: "#FF6200" },
  { name: "Zenith Bank", color: "#C41E3A" },
  { name: "Access Bank", color: "#E05310" },
  { name: "First Bank", color: "#003087" },
  { name: "UBA", color: "#CC0000" },
  { name: "Kuda", color: "#6F2DBD" },
  { name: "OPay", color: "#00AA4F" },
  { name: "PalmPay", color: "#1A7F3C" },
  { name: "Moniepoint", color: "#0068FF" },
  { name: "FCMB", color: "#006400" },
];

const stats = [
  { value: "20+", label: "Circles Created" },
  { value: "₦5M+", label: "Tracked" },
  { value: "100%", label: "Transparent" },
];

export default function HeroSection({ navigate, scrollTo }) {
  const { user } = useAuth();
  const { activeGroup, loadingGroups } = useGroup();

  const [liveContribs, setLiveContribs] = useState(null);
  const [livePayouts, setLivePayouts] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!user || !activeGroup?._id) {
      setLiveContribs(null);
      setLivePayouts([]);
      return;
    }

    let cancelled = false;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    setLiveLoading(true);
    Promise.all([
      api.get(
        `/contributions?groupId=${activeGroup._id}&month=${month}&year=${year}&limit=100`,
      ),
      api.get(`/payouts?groupId=${activeGroup._id}&year=${year}`),
    ])
      .then(([contribRes, payoutRes]) => {
        if (cancelled) return;
        setLiveContribs(contribRes.data.docs || []);
        setLivePayouts(payoutRes.data.payouts || []);
      })
      .catch(() => {
        if (!cancelled) {
          setLiveContribs([]);
          setLivePayouts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, activeGroup?._id]);

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "55% 45%",
          minHeight: "100vh",
        }}
        className="landing-grid"
      >
        {/* LEFT — dark hero */}
        <div
          className="landing-left"
          style={{
            background: "var(--ct-sidebar)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px 72px",
            paddingTop: "120px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.03,
              backgroundImage:
                "radial-gradient(circle, #d4a017 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-120px",
              right: "-120px",
              width: 400,
              height: 400,
              background:
                "radial-gradient(circle, rgba(212,160,23,0.10) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-80px",
              left: "-80px",
              width: 300,
              height: 300,
              background:
                "radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Brand mark — hidden on mobile (navbar already shows it) */}
          <div
            className="animate-fade-up hero-brand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 3,
            }}
          >
            {/* <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))",
                display: "flex",

                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: "#0f0f14",
              }}
            >
              C
            </div> */}
            {/* <span
              style={{
                color: "#f5f2ec",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              ContriTrack
            </span> */}
          </div>

          {/* Label */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.06s", marginBottom: 20 }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(212,160,23,0.1)",
                border: "1px solid rgba(212,160,23,0.25)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ct-gold)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--ct-gold)",
                  display: "inline-block",
                  animation: "pulse-ring 2s infinite",
                }}
              />
              Built for Nigerian contribution circles
            </span>
          </div>

          {/* Headline — single h1 for SEO */}
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <h1
              className="landing-hero-title"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                color: "#f5f2ec",
                marginBottom: 28,
              }}
            >
              Stop arguing{" "}
              <span
                style={{
                  color: "var(--ct-gold)",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(212,160,23,0.4)",
                  textUnderlineOffset: "6px",
                  textDecorationThickness: "3px",
                  display: "block",
                }}
              >
                about who paid.
              </span>
            </h1>
            <p
              style={{
                color: "#7a7a96",
                fontSize: 17,
                lineHeight: 1.75,
                maxWidth: 440,
                marginBottom: 44,
              }}
            >
              Track monthly contributions, enforce penalties, manage payouts,
              and bring full transparency to your Ajo, Esusu, or contribution
              circle — all in one place.
            </p>
          </div>

          {/* CTAs */}
          <div
            className="animate-fade-up hero-cta-row"
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              animationDelay: "0.18s",
            }}
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-gold btn-gold-pulse"
              style={{ padding: "14px 28px", fontSize: 15 }}
            >
              {user
                ? "Create Your Circle Now"
                : "Start Free — Create Your First Circle"}
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              style={{
                padding: "14px 22px",
                background: "transparent",
                color: "#c8c8d8",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "#c8c8d8";
              }}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              See How It Works
            </button>
          </div>

          {/* Trust line */}
          <div
            className="animate-fade-up"
            style={{ marginTop: 18, animationDelay: "0.22s" }}
          >
            <span style={{ color: "#5a5a78", fontSize: 12.5 }}>
              No credit card required&nbsp;·&nbsp;Your money never touches our
              platform&nbsp;·&nbsp;Direct bank transfers only
            </span>
          </div>

          {/* Social proof avatars */}
          <div
            className="animate-fade-up"
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 16,
              animationDelay: "0.28s",
            }}
          >
            <div style={{ display: "flex" }}>
              {["#4f46e5", "#059669", "#d97706", "#e11d48"].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${c}cc, ${c})`,
                    border: "2.5px solid #0f0f14",
                    marginLeft: i === 0 ? 0 : -9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {["C", "E", "F", "T"][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13 }}>
              <span style={{ color: "#7a7a96" }}>
                Trusted by savings circles
              </span>
              <span style={{ color: "var(--ct-gold)", fontWeight: 700 }}>
                {" "}
                across Nigeria
              </span>
            </span>
          </div>

          {/* Mobile features list */}
          <div
            className="landing-mobile-features"
            style={{ display: "none", marginTop: 64 }}
          >
            {heroFeatures.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "var(--ct-gold-bg)",
                    border: "1px solid var(--ct-gold-dim)",
                    color: "var(--ct-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div
                    style={{
                      color: "#f5f2ec",
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 3,
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    style={{ fontSize: 12, lineHeight: 1.55, color: "#7a7a96" }}
                  >
                    {f.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — dashboard mockup */}
        <div
          className="landing-right"
          style={{
            background: "#f7f5f1",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "80px 52px",
            borderLeft: "1px solid rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Soft background gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1,
              background:
                "radial-gradient(ellipse at 70% 30%, rgba(212,160,23,0.07) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40%",
              background:
                "radial-gradient(ellipse at 30% 100%, rgba(5,150,105,0.05) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* Label */}
          <div
            style={{
              position: "relative",
              marginBottom: 28,
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ct-gold)",
              }}
            >
              {user && activeGroup
                ? activeGroup.name
                : "Live dashboard preview"}
            </span>
          </div>

          {/* Dashboard preview — real data for logged-in users, demo for guests */}
          <LandingDashboardPreview
            user={user}
            activeGroup={activeGroup}
            loadingGroups={loadingGroups}
            liveContribs={liveContribs}
            livePayouts={livePayouts}
            liveLoading={liveLoading}
          />
        </div>
      </main>

      {/* ── STATS BAR ─────────────────────────────────────────── */}
      <section
        className="stats-section"
        style={{
          background: "var(--ct-page)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          padding: "52px 64px",
        }}
      >
        <div
          className="stats-bar-inner"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", flex: 1 }}
            >
              <div style={{ flex: 1, textAlign: "center", padding: "0 40px" }}>
                <div
                  className="stats-val"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 44,
                    fontWeight: 800,
                    color: "var(--ct-text-1)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: 8,
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="stats-label"
                  style={{
                    fontSize: 14,
                    color: "var(--ct-text-3)",
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
              {i < stats.length - 1 && (
                <div
                  className="stats-bar-divider"
                  style={{
                    width: 1,
                    height: 56,
                    background: "rgba(0,0,0,0.08)",
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUSTED LOGOS STRIP ───────────────────────────────── */}
      <section
        style={{
          background: "var(--ct-page)",
          padding: "40px 0",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--ct-text-3)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Members transfer via Nigeria's trusted banks
          </p>
        </div>
        <div style={{ overflow: "hidden", position: "relative" }}>
          {/* Fade edges */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 80,
              zIndex: 2,
              background:
                "linear-gradient(to right, var(--ct-page), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 80,
              zIndex: 2,
              background:
                "linear-gradient(to left, var(--ct-page), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            className="logos-track"
            style={{ display: "flex", gap: 0, width: "max-content" }}
          >
            {[...trustedOrgs, ...trustedOrgs].map((org, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "10px 28px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: `${org.color}18`,
                    border: `1px solid ${org.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 900,
                    color: org.color,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {org.name.slice(0, 2).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ct-text-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {org.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
