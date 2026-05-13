const freeFeatures = [
  "1 Circle",
  "Up to 10 members",
  "Contribution tracking + receipt verification",
  "Basic dashboard",
  "Penalties & Pledge (limited)",
];

const proFeatures = [
  "Up to 4 Circles",
  "Unlimited members per circle",
  "Contribution tracking + receipt verification",
  "CSV / PDF exports",
  "Advanced automation & reminders",
  "Penalty tracking & health scoring",
  "Multi-group overview dashboard",
  "Weekly, biweekly, monthly & yearly schedules",
];

export default function PricingSection({ navigate }) {
  return (
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
                ₦3,500
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
            Go Pro — Only ₦3,500/month
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
  );
}
