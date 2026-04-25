const nodemailer = require('nodemailer');

// Build a transporter only when SMTP credentials are configured.
// If not configured, all send calls are silently no-ops so the app
// works without email in development.
function makeTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  const port   = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465; // SSL for 465, STARTTLS for 587
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

const transporter = makeTransporter();
const FROM = process.env.EMAIL_FROM || '"ROTARA" <noreply@contritrack.app>';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Send an email. Silently skips when SMTP is not configured.
 */
async function sendMail({ to, subject, html }) {
  if (!transporter) return; // no SMTP — skip gracefully
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    // Never let email errors crash the API
    console.error('[mailer] Failed to send email:', err.message);
  }
}

/**
 * Notify a member that their contribution was verified or rejected.
 * @param {{ name: string, email: string }} user
 * @param {{ month: number, year: number, amount: number, status: string, rejectionNote?: string }} contribution
 */
async function sendStatusNotification(user, contribution) {
  const { month, year, amount, status, rejectionNote } = contribution;
  const monthName  = MONTHS[(month || 1) - 1];
  const isVerified = status === 'verified';

  const subject = isVerified
    ? `Payment verified — ${monthName} ${year}`
    : `Payment rejected — ${monthName} ${year}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px 20px">
      <div style="background:#0f0f14;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#d4a017;letter-spacing:-0.01em">ROTARA</span>
      </div>

      <h2 style="font-size:22px;font-weight:700;color:#14141e;margin:0 0 12px">
        ${isVerified ? '✅ Payment Verified' : '❌ Payment Rejected'}
      </h2>

      <p style="color:#44445a;font-size:14px;line-height:1.6;margin:0 0 20px">
        Hi <strong>${user.name}</strong>,<br>
        Your contribution of <strong>₦${Number(amount).toLocaleString()}</strong> for
        <strong>${monthName} ${year}</strong> has been
        <strong style="color:${isVerified ? '#059669' : '#e11d48'}">${status}</strong>
        by an administrator.
      </p>

      ${!isVerified && rejectionNote ? `
        <div style="background:#fff5f7;border:1px solid rgba(225,29,72,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:0.06em">Reason from admin</p>
          <p style="margin:0;font-size:13.5px;color:#44445a;">${rejectionNote}</p>
        </div>
      ` : ''}

      ${!isVerified ? `
        <p style="color:#44445a;font-size:14px;line-height:1.6;margin:0 0 20px">
          Please re-upload your proof of payment or contact your circle admin if you believe this is an error.
        </p>
      ` : ''}

      <hr style="border:none;border-top:1px solid #e8e4dc;margin:24px 0">
      <p style="color:#8888a4;font-size:12px;margin:0">
        This is an automated message from ROTARA. Please do not reply.
      </p>
    </div>
  `;

  await sendMail({ to: user.email, subject, html });
}

/**
 * Send a password-reset email.
 * @param {{ name: string, email: string }} user
 * @param {string} token  — the raw (un-hashed) 32-byte hex token
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px 20px">
      <div style="background:#0f0f14;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#d4a017;letter-spacing:-0.01em">ROTARA</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;color:#14141e;margin:0 0 12px">Reset your password</h2>
      <p style="color:#44445a;font-size:14px;line-height:1.6;margin:0 0 20px">
        Hi <strong>${user.name}</strong>,<br>
        We received a request to reset your ROTARA password. Click the button below to choose a new password.
        This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#d4a017;color:#0f0f14;font-weight:700;font-size:15px;
                padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
        Reset Password
      </a>
      <p style="color:#8888a4;font-size:13px;margin:0 0 8px">
        Or copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color:#d4a017;word-break:break-all">${resetUrl}</a>
      </p>
      <p style="color:#8888a4;font-size:12px;margin:16px 0 0">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e8e4dc;margin:24px 0">
      <p style="color:#8888a4;font-size:12px;margin:0">This is an automated message from ROTARA. Please do not reply.</p>
    </div>
  `;

  await sendMail({ to: user.email, subject: 'Reset your ROTARA password', html });
}

/**
 * Send a 6-digit OTP for email verification.
 * @param {{ name: string, email: string }} user
 * @param {string} otp  — the plain 6-digit code
 */
async function sendOtpEmail(user, otp) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px 20px">
      <div style="background:#0f0f14;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#d4a017;letter-spacing:-0.01em">ROTARA</span>
      </div>
      <h2 style="font-size:22px;font-weight:700;color:#14141e;margin:0 0 12px">Verify your email address</h2>
      <p style="color:#44445a;font-size:14px;line-height:1.6;margin:0 0 24px">
        Hi <strong>${user.name}</strong>,<br>
        Enter this code on the ROTARA verification page to activate your account.
        It expires in <strong>10 minutes</strong>.
      </p>

      <div style="background:#f5f2eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#8888a4;text-transform:uppercase;letter-spacing:0.08em">Your verification code</p>
        <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:0.18em;color:#0f0f14;font-family:monospace">${otp}</p>
      </div>

      <p style="color:#8888a4;font-size:13px;margin:0 0 4px">
        If you didn't create a ROTARA account, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e8e4dc;margin:24px 0">
      <p style="color:#8888a4;font-size:12px;margin:0">This is an automated message from ROTARA. Please do not reply.</p>
    </div>
  `;

  await sendMail({ to: user.email, subject: 'Your ROTARA verification code', html });
}

module.exports = { sendMail, sendStatusNotification, sendPasswordResetEmail, sendOtpEmail };
