const schedules = [
  {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    freq: "Weekly",
    title: "Weekly Thrift Groups",
    body: "Fast-moving groups that collect every week. ROTARA tracks each period separately so no contribution gets lost.",
    examples: ["Office weekly thrift", "Market women groups", "Youth savings clubs"],
    color: "#4f46e5",
    bg: "rgba(79,70,229,0.07)",
    border: "rgba(79,70,229,0.18)",
  },
  {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    freq: "Biweekly",
    title: "Biweekly Office Contributions",
    body: "Collect every two weeks aligned to salary cycles. Works for workplace cooperatives and staff welfare groups.",
    examples: ["Salary-aligned thrift", "Staff welfare funds", "Corporate cooperatives"],
    color: "#059669",
    bg: "rgba(5,150,105,0.07)",
    border: "rgba(5,150,105,0.18)",
  },
  {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    freq: "Monthly",
    title: "Monthly Ajo & Esusu Circles",
    body: "The most common format. Monthly contribution periods with payout rotation tracked automatically for every member.",
    examples: ["Family Ajo", "Church Esusu", "Neighbourhood thrift"],
    color: "#d4a017",
    bg: "rgba(212,160,23,0.07)",
    border: "rgba(212,160,23,0.25)",
  },
  {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    freq: "Yearly",
    title: "Yearly Cooperative Savings",
    body: "Long-horizon groups where members contribute annually or save toward a single end-of-year payout.",
    examples: ["Annual cooperative", "Year-end savings", "Festive thrift groups"],
    color: "#e11d48",
    bg: "rgba(225,29,72,0.07)",
    border: "rgba(225,29,72,0.18)",
  },
];

export default function SchedulesSection() {
  return (
    <section
      id="schedules"
      style={{
        background: "var(--ct-page)",
        padding: "96px 64px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 64px" }}>
        <span className="section-tag">Flexible schedules</span>
        <h2
          className="schedules-h2"
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
          Works for every contribution schedule
        </h2>
        <p style={{ fontSize: 16, color: "var(--ct-text-2)", lineHeight: 1.6 }}>
          Whether your group collects weekly or once a year, ROTARA keeps every period
          accounted for — no arguments, no missing records.
        </p>
      </div>

      <div
        className="schedules-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {schedules.map((s, i) => (
          <div
            key={i}
            className="animate-fade-up"
            style={{
              padding: "32px",
              borderRadius: 18,
              background: s.bg,
              border: `1px solid ${s.border}`,
              animationDelay: `${0.08 * i}s`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  background: `${s.color}18`,
                  border: `1px solid ${s.color}30`,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: s.color,
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  {s.freq}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--ct-text-1)",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {s.title}
                </h3>
              </div>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--ct-text-2)",
                lineHeight: 1.75,
                marginBottom: 18,
              }}
            >
              {s.body}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.examples.map((ex, j) => (
                <span
                  key={j}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: s.color,
                    background: `${s.color}12`,
                    border: `1px solid ${s.color}25`,
                    padding: "3px 10px",
                    borderRadius: 20,
                  }}
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
