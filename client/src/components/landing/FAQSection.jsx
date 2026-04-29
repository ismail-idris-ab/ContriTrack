import { useState } from 'react';


const FAQS = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How is Rotata different from managing on WhatsApp?',
        a: 'Rotata gives your circle a dedicated platform with automatic payment tracking, proof uploads, admin dashboards, and audit logs. No more chasing screenshots in a group chat or arguing over who paid last month — every naira is recorded and verified in one place.',
      },
      {
        q: 'Do all members need smartphones?',
        a: 'Any member with a smartphone and internet access can participate. Members upload payment proof, check their history, and receive notifications — all from a browser. No app installation is required.',
      },
      {
        q: 'What if my group already started on Excel or WhatsApp?',
        a: 'You can migrate easily. An admin creates the circle, adds existing members, and sets the starting month. Past records can be uploaded as proof images to establish history from day one.',
      },
      {
        q: 'How many members can a circle have?',
        a: 'There is no hard member limit. Rotata is designed to scale from small family Ajo groups of 5 to large office thrift societies with 100+ members. The Pro and Coordinator plans unlock larger circle sizes and multiple circles per account.',
      },
    ],
  },
  {
    category: 'Security',
    items: [
      {
        q: 'Is my money safe? How does Rotata handle payments?',
        a: 'Rotata does not hold or move your money. It tracks and verifies proof of payments made directly between members and the circle recipient. Your funds always stay in your own bank accounts — Rotata is the record-keeper, not the custodian.',
      },
      {
        q: 'Who can see my group\'s contributions?',
        a: 'Only members of your specific circle and your group admin can see contribution records. Other circles on the platform have no access to your data. Platform admins can view records only for operational and support purposes.',
      },
      {
        q: 'What if someone claims they paid but didn\'t?',
        a: 'Every contribution requires a proof image — bank receipt, transfer screenshot, or PDF — uploaded to Rotata. An admin reviews and verifies each proof before it is marked as paid. No proof, no verification. The audit log records every action with timestamps.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'What happens if my payment proof is rejected?',
        a: 'You will receive an email explaining the reason for the rejection. You can then go to the My Payments page and click Resubmit to upload a corrected proof. The submission returns to the admin queue for review without losing your original submission record.',
      },
      {
        q: 'What is a late submission?',
        a: 'Each circle has a contribution due date and a grace period set by the admin. Submissions made after the grace period expires are automatically flagged as late. This helps admins track punctuality and apply penalties where the group has agreed to do so.',
      },
      {
        q: 'Can I submit proof for more than one cycle per month?',
        a: 'Yes. If your circle is configured for multiple contribution cycles per month, you can submit separate proofs for each cycle. The cycle selector appears automatically on the upload form when your circle uses this setting.',
      },
    ],
  },
  {
    category: 'Plans & Pricing',
    items: [
      {
        q: 'What is included in the free plan?',
        a: 'The free plan lets you join existing circles as a member, submit payment proofs, and view your contribution history. Creating and managing your own circles requires a Pro or Coordinator plan.',
      },
      {
        q: 'Can I upgrade or downgrade at any time?',
        a: 'You can upgrade your plan at any time and your new features activate immediately. Downgrading takes effect at the end of your current billing cycle so you never lose access mid-period.',
      },
      {
        q: 'Is there a trial period?',
        a: 'New accounts can explore the platform before committing to a paid plan. Reach out to our support team if you need an extended trial for a large group migration.',
      },
    ],
  },
];

function ChevronIcon({ open }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        flexShrink: 0,
        color: open ? 'var(--ct-gold, #d4a017)' : 'rgba(255,255,255,0.3)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${open ? 'rgba(212,160,23,0.25)' : 'rgba(255,255,255,0.07)'}`,
        background: open ? 'rgba(212,160,23,0.04)' : 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '18px 22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: open ? '#f5f0e8' : 'rgba(245,240,232,0.82)',
            lineHeight: 1.4,
            transition: 'color 0.2s',
          }}
        >
          {q}
        </span>
        <ChevronIcon open={open} />
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              margin: 0,
              padding: '0 22px 20px',
              fontSize: 14,
              color: 'rgba(255,255,255,0.52)',
              lineHeight: 1.7,
              fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
            }}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openKey, setOpenKey] = useState(null);

  const toggle = (key) => setOpenKey(prev => prev === key ? null : key);

  return (
    <section
      id="faq"
      style={{
        background: 'var(--ct-bg, #0f0f14)',
        padding: '96px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          background: 'radial-gradient(ellipse, rgba(212,160,23,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 14px 5px 10px',
              borderRadius: 999,
              border: '1px solid rgba(212,160,23,0.28)',
              background: 'rgba(212,160,23,0.07)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: 'var(--ct-gold, #d4a017)',
              marginBottom: 20,
              fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--ct-gold, #d4a017)',
                flexShrink: 0,
              }}
            />
            FAQ
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display, "Playfair Display", serif)',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700,
              color: '#f5f0e8',
              margin: '0 0 16px',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            Frequently Asked{' '}
            <span style={{ color: 'var(--ct-gold, #d4a017)' }}>Questions</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.42)',
              margin: 0,
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
            }}
          >
            Everything you need to know about Rotata
          </p>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {FAQS.map(({ category, items }) => (
            <div key={category}>
              <p
                style={{
                  fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ct-gold, #d4a017)',
                  margin: '0 0 16px',
                }}
              >
                {category}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item) => (
                  <FAQItem
                    key={item.q}
                    {...item}
                    open={openKey === item.q}
                    onToggle={() => toggle(item.q)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            marginTop: 64,
            textAlign: 'center',
            padding: '32px 28px',
            borderRadius: 18,
            border: '1px solid rgba(212,160,23,0.15)',
            background: 'rgba(212,160,23,0.04)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              margin: '0 0 16px',
              lineHeight: 1.5,
            }}
          >
            Still have questions? We're happy to help.
          </p>
          <a
            href="mailto:support@rotata.ng"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 24px',
              borderRadius: 10,
              background: 'var(--ct-gold, #d4a017)',
              color: '#0f0f14',
              fontFamily: 'var(--font-sans, "Plus Jakarta Sans", sans-serif)',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Contact Support
          </a>
        </div>

      </div>
    </section>
  );
}
