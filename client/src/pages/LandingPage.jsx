import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroup } from "../context/GroupContext";
import api from "../api/axios";
import LandingDashboardPreview from "../components/LandingDashboardPreview";

/* ─── Static data ─────────────────────────────────────────────── */

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

const featuredQuote = {
  quote:
    "ContriTrack transformed how our 40-member Ajo operates. What used to take three hours of WhatsApp chasing now takes under ten minutes. Every naira is accounted for — and my members finally trust the system.",
  name: "Fatima O.",
  role: "Admin, Lagos Women's Circle",
  avatarColor: "#4f46e5",
  stat: "40 members · ₦1.4M tracked monthly",
};

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

const steps = [
  {
    num: "01",
    title: "Create a Circle",
    body: "Set up your Ajo or monthly contribution group. Choose contribution amount, cycle rules, and enable penalties or flexible pledges.",
    icon: (
      <svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Invite Members",
    body: "Share a simple invite code or link. Members join, view the group ledger, and submit payments with proof.",
    icon: (
      <svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Track, Penalize & Pay Out",
    body: "Everyone sees the same transparent record — no more he-said-she-said.",
    bullets: [
      "Record verified contributions in real time",
      "Apply penalties automatically for late payments",
      "Use Pledge for early payout requests",
      "Execute fair payouts and generate reports instantly",
    ],
    icon: (
      <svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
];

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

const testimonials = [
  {
    quote:
      "ContriTrack saved me hours every month. My members now trust the system more than they trust me!",
    name: "Chisom A.",
    role: "Ajo Organizer, Lagos",
    color: "#4f46e5",
  },
  {
    quote:
      "The penalties feature finally made people pay on time. No more excuses.",
    name: "Jabir D.",
    role: "Thrift Coordinator, Port Harcourt",
    color: "#059669",
  },
  {
    quote: "Reports are so clean I can even show them to my bank.",
    name: "Fatima A.",
    role: "Circle Admin, Abuja",
    color: "#d97706",
  },
];

const stats = [
  { value: "20+", label: "Circles Created" },
  { value: "₦5M+", label: "Tracked" },
  { value: "100%", label: "Transparent" },
];

const freeFeatures = [
  "1 Circle",
  "Unlimited members",
  "Contribution tracking + receipt verification",
  "Basic dashboard & reports",
  "Penalties & Pledge (limited)",
];

const proFeatures = [
  "Unlimited Circles",
  "Multi-group overview dashboard",
  "Advanced automation & reminders",
  "Full PDF / CSV exports",
  "Admin fee tools (charge management fee)",
  "Priority support",
  "Advanced penalties & health scoring",
];

const NAV_LINKS = [
  { label: "How It Works", href: "how-it-works" },
  { label: "Features", href: "features" },
  { label: "Testimonials", href: "testimonials" },
  { label: "Pricing", href: "pricing" },
];

const footerColumns = [
  {
    title: "Product",
    items: [
      { label: "How It Works", href: "how-it-works", scroll: true },
      { label: "Features", href: "features", scroll: true },
      { label: "Pricing", href: "pricing", scroll: true },
      { label: "Calculator", href: "pricing", scroll: true },
    ],
  },
  {
    title: "Use Cases",
    items: [
      { label: "Ajo & Esusu", href: "how-it-works", scroll: true },
      { label: "Church Thrift", href: "how-it-works", scroll: true },
      { label: "Office Circles", href: "how-it-works", scroll: true },
      { label: "Family Savings", href: "how-it-works", scroll: true },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "testimonials", scroll: true },
      { label: "Get Started", href: null, route: "/register", scroll: false },
      { label: "Log In", href: null, route: "/login", scroll: false },
      { label: "Pricing", href: "pricing", scroll: true },
    ],
  },
];

/* ─── Component ──────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup, loadingGroups } = useGroup();

  // Calculator state
  const [members, setMembers] = useState(12);
  const [contribution, setContribution] = useState(10000);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live dashboard state
  const [liveContribs, setLiveContribs] = useState(null); // null = not yet fetched
  const [livePayouts, setLivePayouts] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch current-month contributions + this-year payouts whenever the active group changes
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

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileOpen(false);
  };

  const monthlyPot = members * contribution;
  const yearlyTotal = monthlyPot * 12;
  const fmt = (n) => "₦" + n.toLocaleString("en-NG");

  return (
    <div
      className="landing-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav
        aria-label="Site navigation"
        className="landing-nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          height: 64,
          background: scrolled ? "rgba(10,10,16,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid transparent",
          transition: "background 0.3s, border-color 0.3s",
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background:
                "linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              color: "#0f0f14",
            }}
          >
            C
          </div>
          <span
            style={{
              color: "#f5f2ec",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.01em",
            }}
          >
            ContriTrack
          </span>
        </button>

        {/* Centered nav links */}
        <div
          className="nav-links"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              className="nav-link"
              onClick={() => scrollTo(link.href)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: 500,
                color: "#9898b4",
                fontFamily: "var(--font-sans)",
                borderRadius: 8,
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Log In — pinned right */}
        <div
          className="nav-links"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}
        >
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#9898b4",
              fontFamily: "var(--font-sans)",
              borderRadius: 8,
              transition: "color 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 5,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f5f2ec";
              e.currentTarget.querySelector("span").style.textDecoration =
                "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9898b4";
              e.currentTarget.querySelector("span").style.textDecoration =
                "none";
            }}
          >
            <span
              style={{
                textDecoration: "none",
                transition: "text-decoration 0.15s",
              }}
            >
              Log In
            </span>
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          className="nav-mobile-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={
            mobileOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            color: "#f5f2ec",
            marginLeft: "auto",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mobileOpen ? (
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* ── MOBILE MENU ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map((link) => (
            <div
              key={link.href}
              className="mobile-nav-link"
              onClick={() => scrollTo(link.href)}
            >
              {link.label}
            </div>
          ))}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <button
              onClick={() => {
                navigate("/register");
                setMobileOpen(false);
              }}
              className="btn-gold btn-gold-pulse"
              style={{
                padding: "15px",
                fontSize: 16,
                textAlign: "center",
                borderRadius: 12,
              }}
            >
              Start Free
            </button>
            <button
              onClick={() => {
                navigate("/login");
                setMobileOpen(false);
              }}
              style={{
                padding: "15px",
                fontSize: 15,
                fontWeight: 600,
                color: "#9898b4",
                background: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Log In
            </button>
          </div>
        </div>
      )}

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
              onClick={() =>
                navigate(user ? "/groups" : "/register?intent=create")
              }
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

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="hiw-section"
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
            maxWidth: 680,
            margin: "0 auto 72px",
            position: "relative",
          }}
        >
          <span className="section-tag">How it works</span>
          <h2
            className="hiw-h2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 700,
              color: "#f5f2ec",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Manage your contribution group smarter in under 2 minutes.
          </h2>
        </div>
        <div
          className="hiw-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 28,
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="animate-fade-up"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div
                style={{
                  padding: "36px 32px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,160,23,0.3)";
                  e.currentTarget.style.background = "rgba(212,160,23,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 52,
                    fontWeight: 800,
                    color: "var(--ct-gold)",
                    opacity: 0.25,
                    lineHeight: 1,
                    marginBottom: 20,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 13,
                    background: "var(--ct-gold-bg)",
                    border: "1px solid var(--ct-gold-dim)",
                    color: "var(--ct-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#f5f2ec",
                    marginBottom: 12,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#7a7a96",
                    lineHeight: 1.75,
                    marginBottom: step.bullets ? 18 : 0,
                    flex: 1,
                  }}
                >
                  {step.body}
                </p>
                {step.bullets && (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {step.bullets.map((b, j) => (
                      <li
                        key={j}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <svg
                          width={14}
                          height={14}
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
                          style={{
                            fontSize: 13,
                            color: "#9898b4",
                            lineHeight: 1.6,
                          }}
                        >
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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
          <span className="section-tag">Why ContriTrack</span>
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
                Set rules once. ContriTrack tracks deadlines, applies penalties
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
          <span className="section-tag">The ContriTrack Difference</span>
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
                Before ContriTrack
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
                With ContriTrack
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
                moving through your circle every year — ContriTrack ensures
                every naira is accounted for.
              </p>
              <button
                onClick={() =>
                  navigate(user ? "/groups" : "/register?intent=create")
                }
                className="btn-gold btn-gold-pulse"
                style={{ padding: "14px 32px", fontSize: 15 }}
              >
                {user
                  ? "Create Your Circle Now"
                  : "Start Tracking Your Circle — Free"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ────────────────────────────────────────── */}
      <section
        className="pull-quote-section"
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
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 500,
            background:
              "radial-gradient(ellipse, rgba(212,160,23,0.06) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            position: "relative",
            textAlign: "center",
          }}
        >
          {/* Large quotation mark */}
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 120,
              lineHeight: 0.6,
              color: "var(--ct-gold)",
              opacity: 0.25,
              userSelect: "none",
              marginBottom: 32,
            }}
          >
            "
          </div>

          <blockquote
            className="pull-quote-text"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 600,
              color: "#e8e4da",
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              maxWidth: 760,
              margin: "0 auto 48px",
              fontStyle: "italic",
              border: "none",
              padding: 0,
            }}
          >
            {featuredQuote.quote}
          </blockquote>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${featuredQuote.avatarColor}cc, ${featuredQuote.avatarColor})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {featuredQuote.name.charAt(0)}
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{ fontWeight: 700, fontSize: 15, color: "#f5f2ec" }}
                >
                  {featuredQuote.name}
                </div>
                <div style={{ fontSize: 13, color: "#6868a4" }}>
                  {featuredQuote.role}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                padding: "5px 14px",
                borderRadius: 20,
                background: "rgba(212,160,23,0.1)",
                border: "1px solid rgba(212,160,23,0.2)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ct-gold)",
              }}
            >
              {featuredQuote.stat}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section
        id="testimonials"
        className="proof-section"
        style={{
          background: "var(--ct-sidebar)",
          padding: "0 64px 96px",
          position: "relative",
          overflow: "hidden",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 680,
            margin: "0 auto 48px",
            position: "relative",
            paddingTop: 64,
          }}
        >
          <span className="section-tag">What organizers say</span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 700,
              color: "#f5f2ec",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Tired of manual tracking? You're not alone.
          </h2>
        </div>
        <div
          className="proof-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 22,
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="animate-fade-up"
              style={{
                padding: 30,
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                transition: "border-color 0.2s, background 0.2s",
                animationDelay: `${0.1 * i}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <div
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 52,
                  lineHeight: 0.8,
                  color: "var(--ct-gold)",
                  opacity: 0.35,
                  marginBottom: 14,
                  userSelect: "none",
                }}
              >
                "
              </div>
              <p
                style={{
                  fontSize: 14.5,
                  color: "#c8c8d8",
                  lineHeight: 1.75,
                  marginBottom: 22,
                  fontStyle: "italic",
                }}
              >
                "{t.quote}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}cc, ${t.color})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: "#f5f2ec" }}
                  >
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6868a4" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section
        id="pricing"
        className="pricing-section"
        style={{
          background: "var(--ct-page)",
          padding: "96px 64px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 64px" }}
        >
          <span className="section-tag">Pricing</span>
          <h2
            className="pricing-h2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 700,
              color: "var(--ct-text-1)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Clear &amp; honest pricing.
          </h2>
          <p
            style={{ fontSize: 16, color: "var(--ct-text-2)", lineHeight: 1.6 }}
          >
            Start free. Go Pro when your circle is serious.
          </p>
        </div>
        <div
          className="pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            maxWidth: 820,
            margin: "0 auto",
          }}
        >
          {/* Free */}
          <div
            style={{
              padding: 36,
              borderRadius: 20,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ct-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Free
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 44,
                  fontWeight: 900,
                  color: "var(--ct-text-1)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                ₦0
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ct-text-3)",
                  marginTop: 6,
                }}
              >
                Forever free
              </div>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(0,0,0,0.06)",
                marginBottom: 28,
              }}
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {freeFeatures.map((feat, i) => (
                <li
                  key={i}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
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
                    style={{ flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--ct-text-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/register")}
              style={{
                width: "100%",
                padding: 14,
                background: "transparent",
                border: "1.5px solid rgba(0,0,0,0.15)",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                color: "var(--ct-text-1)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--ct-gold)";
                e.currentTarget.style.color = "var(--ct-gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
                e.currentTarget.style.color = "var(--ct-text-1)";
              }}
            >
              Start Free Today
            </button>
          </div>

          {/* Pro */}
          <div
            className="pricing-card-pro"
            style={{
              padding: 36,
              borderRadius: 20,
              background: "var(--ct-sidebar)",
              border: "1.5px solid var(--ct-gold-dim)",
              boxShadow: "0 8px 32px rgba(212,160,23,0.10)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                background:
                  "radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                padding: "4px 12px",
                background: "var(--ct-gold)",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color: "#0f0f14",
                letterSpacing: "0.04em",
              }}
            >
              RECOMMENDED
            </div>
            <div style={{ marginBottom: 28, position: "relative" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ct-gold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Pro
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 44,
                    fontWeight: 900,
                    color: "#f5f2ec",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  ₦4,500
                </div>
                <div
                  style={{ fontSize: 14, color: "#8888a4", marginBottom: 7 }}
                >
                  / month
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#6868a4", marginTop: 6 }}>
                For serious organizers
              </div>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.07)",
                marginBottom: 28,
              }}
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
              }}
            >
              {proFeatures.map((feat, i) => (
                <li
                  key={i}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ct-gold)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                  <span
                    style={{ fontSize: 14, color: "#c8c8d8", lineHeight: 1.5 }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/register")}
              className="btn-gold"
              style={{
                width: "100%",
                padding: 14,
                textAlign: "center",
                position: "relative",
              }}
            >
              Go Pro — Only ₦4,500/month
            </button>
            <p
              style={{
                fontSize: 12,
                color: "#6868a4",
                textAlign: "center",
                marginTop: 14,
                lineHeight: 1.5,
                position: "relative",
              }}
            >
              Recover the fee from one month of management charges or by
              avoiding a single dispute.
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section
        className="final-cta-section"
        style={{
          background: "#0b0b12",
          padding: "96px 64px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background effects */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.035,
            backgroundImage:
              "radial-gradient(circle, #d4a017 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 500,
            background:
              "radial-gradient(ellipse, rgba(212,160,23,0.09) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "20%",
            width: 300,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(5,150,105,0.05) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <span
            className="section-tag"
            style={{ marginBottom: 20, display: "block" }}
          >
            Get started today
          </span>
          <h2
            className="final-cta-h2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 900,
              color: "#f5f2ec",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: 24,
            }}
          >
            Ready to bring order and trust to your contribution group?
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "#6a6a88",
              lineHeight: 1.75,
              maxWidth: 460,
              margin: "0 auto 44px",
            }}
          >
            Set up your circle in under 2 minutes. No spreadsheets. No
            arguments. Just clarity.
          </p>
          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => navigate("/register")}
              className="btn-gold btn-gold-pulse"
              style={{ padding: "18px 48px", fontSize: 16 }}
            >
              Create Your Free Circle Now
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "18px 28px",
                fontSize: 15,
                fontWeight: 600,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "#c8c8d8",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all 0.2s",
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
              Log In
            </button>
          </div>
          <div style={{ marginTop: 22, fontSize: 13, color: "#44445a" }}>
            No credit card required&nbsp;·&nbsp;Free forever on one circle
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer
        className="landing-footer"
        aria-label="Site footer"
        style={{
          background: "#080810",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "64px 64px 40px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Top: brand + columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
              gap: 48,
              marginBottom: 56,
            }}
            className="footer-cols"
          >
            {/* Brand */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background:
                      "linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#0f0f14",
                  }}
                >
                  C
                </div>
                <span
                  style={{
                    color: "#f5f2ec",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                  }}
                >
                  ContriTrack
                </span>
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "#44445a",
                  lineHeight: 1.75,
                  maxWidth: 260,
                }}
              >
                The accountability layer for Nigerian Ajo, Esusu, Adashe &amp;
                contribution circles.
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {[
                  "Your data is secure",
                  "App never holds money",
                  "Direct bank transfers only",
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <svg
                      width={11}
                      height={11}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--ct-emerald)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                    </svg>
                    <span style={{ fontSize: 12, color: "#3a3a56" }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Columns */}
            {footerColumns.map((col, ci) => (
              <div key={ci}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#5a5a78",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 20,
                  }}
                >
                  {col.title}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {col.items.map((item, ii) => (
                    <button
                      key={ii}
                      onClick={() => {
                        if (item.scroll) scrollTo(item.href);
                        else if (item.route) navigate(item.route);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        fontSize: 14,
                        color: "#44445a",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#c8c8d8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#44445a";
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            className="footer-bottom"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.04)",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, color: "#2a2a40" }}>
              © {new Date().getFullYear()} ContriTrack. All rights reserved.
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["Privacy Policy", "Terms of Service", "Support"].map(
                (link, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "#2a2a40",
                      cursor: "default",
                    }}
                  >
                    {link}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
