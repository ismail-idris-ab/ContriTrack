export default function FinalCTASection({ navigate }) {
  return (
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
  );
}
