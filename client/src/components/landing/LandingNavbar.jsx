import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { label: "How It Works", href: "how-it-works" },
  { label: "Features", href: "features" },
  { label: "Testimonials", href: "testimonials" },
  { label: "Pricing", href: "pricing" },
];

export default function LandingNavbar({ scrollTo }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleScrollTo = (id) => {
    scrollTo(id);
    setMobileOpen(false);
  };

  return (
    <>
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
              onClick={() => handleScrollTo(link.href)}
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
            onClick={() => navigate("/dashboard")}
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
              onClick={() => handleScrollTo(link.href)}
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
                navigate("/dashboard");
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
                navigate("/dashboard");
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
    </>
  );
}
