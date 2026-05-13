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
      { label: "Get Started", href: null, route: "/dashboard", scroll: false },
      { label: "Log In", href: null, route: "/dashboard", scroll: false },
      { label: "Pricing", href: "pricing", scroll: true },
    ],
  },
];

export default function LandingFooter({ navigate, scrollTo }) {
  return (
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
                R
              </div>
              <span
                style={{
                  color: "#f5f2ec",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: "-0.01em",
                }}
              >
                ROTARA
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
            © {new Date().getFullYear()} ROTARA. All rights reserved.
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
  );
}
