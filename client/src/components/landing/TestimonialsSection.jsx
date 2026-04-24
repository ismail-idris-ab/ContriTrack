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

const featuredQuote = {
  quote:
    "ContriTrack transformed how our 40-member Ajo operates. What used to take three hours of WhatsApp chasing now takes under ten minutes. Every naira is accounted for — and my members finally trust the system.",
  name: "Fatima O.",
  role: "Admin, Lagos Women's Circle",
  avatarColor: "#4f46e5",
  stat: "40 members · ₦1.4M tracked monthly",
};

export default function TestimonialsSection() {
  return (
    <>
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
    </>
  );
}
