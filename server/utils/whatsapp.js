/**
 * WhatsApp / SMS reminder utility.
 *
 * Provider: Termii (https://termii.com) — popular in Nigeria.
 * Falls back gracefully when TERMII_API_KEY is not configured.
 *
 * Env vars required:
 *   TERMII_API_KEY   — Termii secret key
 *   TERMII_SENDER_ID — Alphanumeric sender ID approved by Termii (default: "ContriTrack")
 *
 * Message channel: whatsapp (falls back to generic if WhatsApp not enabled on plan)
 */

const https = require('https');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function termiiRequest(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.ng.termii.com',
      port:     443,
      path:     '/api/sms/send',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Send a WhatsApp (or SMS fallback) reminder via Termii.
 * Silently no-ops when TERMII_API_KEY is not configured.
 *
 * @param {{ name: string, phone: string }} recipient
 * @param {{ groupName: string, month: number, year: number, amount: number }} data
 */
async function sendPaymentReminder(recipient, data) {
  if (!process.env.TERMII_API_KEY) return; // not configured — skip gracefully

  const { name, phone } = recipient;
  if (!phone) return; // no phone number stored

  const { groupName, month, year, amount } = data;
  const monthName = MONTHS[(month || 1) - 1];

  // Normalise Nigerian number (strip leading 0, add country code)
  const digits  = String(phone).replace(/\D/g, '');
  const e164    = digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`;

  const message =
    `Hello ${name}! 👋\n\n` +
    `This is a friendly reminder that your *${groupName}* contribution for *${monthName} ${year}* ` +
    `(₦${Number(amount).toLocaleString()}) is due.\n\n` +
    `Please upload your payment proof on ContriTrack to confirm your payment.\n\n` +
    `_ContriTrack — savings made transparent_ 🌟`;

  const body = {
    api_key:   process.env.TERMII_API_KEY,
    to:        e164,
    from:      process.env.TERMII_SENDER_ID || 'ContriTrack',
    sms:       message,
    type:      'unicode',
    channel:   'whatsapp', // Termii will fallback to generic if WhatsApp not enabled
    media: null,
  };

  try {
    const result = await termiiRequest(body);
    if (result.code && result.code !== 'ok') {
      console.warn('[whatsapp] Termii warning:', result.message || result.code);
    }
  } catch (err) {
    // Never crash the caller — reminders are fire-and-forget
    console.error('[whatsapp] Failed to send reminder:', err.message);
  }
}

/**
 * Send bulk payment reminders to all unpaid members of a group.
 *
 * @param {Array<{ name: string, phone: string }>} unpaidMembers
 * @param {{ groupName: string, month: number, year: number, amount: number }} data
 * @returns {{ sent: number, skipped: number }}
 */
async function sendBulkReminders(unpaidMembers, data) {
  let sent = 0;
  let skipped = 0;

  for (const member of unpaidMembers) {
    if (!member.phone) { skipped++; continue; }
    await sendPaymentReminder(member, data);
    sent++;
    // Small delay to avoid Termii rate limits
    await new Promise(r => setTimeout(r, 150));
  }

  return { sent, skipped };
}

module.exports = { sendPaymentReminder, sendBulkReminders };
