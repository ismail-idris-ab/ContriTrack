const steps = [
  {
    num: "01",
    title: "Create a Circle",
    body: "Set up your Ajo, Esusu, Adashe, or thrift group. Name your circle and set the contribution amount.",
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
    title: "Choose Your Schedule",
    body: "Pick the contribution frequency that works for your group — weekly, biweekly, monthly, or yearly. Enable penalties or flexible pledges.",
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
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    num: "03",
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
    num: "04",
    title: "Track Proof & Manage Payouts",
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

export default function HowItWorksSection() {
  return (
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
          gridTemplateColumns: "1fr 1fr",
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
  );
}
