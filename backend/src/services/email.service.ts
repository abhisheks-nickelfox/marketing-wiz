import nodemailer from 'nodemailer';

// ── Transporter ───────────────────────────────────────────────────────────────
// Reads SMTP config from env vars.  Falls back to console logging when not set
// so development/CI works without an SMTP server.

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM?.trim() ?? 'noreply@aiwealth.com';

// ── Public helpers ────────────────────────────────────────────────────────────

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

async function send(opts: SendOptions): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    // Dev mode — print to console instead of throwing
    console.log(`[email.service] SMTP not configured — would have sent:\n  To: ${opts.to}\n  Subject: ${opts.subject}`);
    return;
  }

  await transporter.sendMail({ from: FROM, ...opts });
}

// ── Onboarding invite ─────────────────────────────────────────────────────────

export async function sendInviteEmail(
  userEmail: string,
  userName: string,
  inviteLink: string,
): Promise<void> {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#181D27">
      <h2 style="font-size:20px;margin-bottom:4px">You've been invited!</h2>
      <p style="color:#535862;margin-top:0">
        Hi${userName ? ` ${userName}` : ''}, you have been invited to join the team.
        Click the button below to set up your account.
      </p>

      <a href="${inviteLink}"
        style="display:inline-block;margin:24px 0;background:#7F56D9;color:#fff;text-decoration:none;
               font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">
        Accept invitation
      </a>

      <p style="color:#717680;font-size:13px">
        This link expires in 24 hours. If you didn't expect this invitation,
        you can safely ignore this email.
      </p>
    </div>
  `;

  await send({
    to: userEmail,
    subject: "You've been invited — set up your account",
    html,
  });
}

// ── Profile update notification ───────────────────────────────────────────────

export interface UpdatedFields {
  name?: string;
  role?: string;
  member_role?: string;
  status?: string;
  skills?: string[];
}

export async function sendProfileUpdateEmail(
  userEmail: string,
  userName: string,
  changes: UpdatedFields,
): Promise<void> {
  const rows = Object.entries(changes)
    .filter(([, v]) => v !== undefined)
    .map(([key, val]) => {
      const label = {
        name:        'Name',
        role:        'System Role',
        member_role: 'Job Title',
        status:      'Account Status',
        skills:      'Skills',
      }[key] ?? key;

      const display = Array.isArray(val) ? val.join(', ') : String(val);
      return `<tr>
        <td style="padding:6px 12px;font-weight:600;color:#414651;white-space:nowrap">${label}</td>
        <td style="padding:6px 12px;color:#535862">${display}</td>
      </tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#181D27">
      <h2 style="font-size:20px;margin-bottom:4px">Your profile was updated</h2>
      <p style="color:#535862;margin-top:0">Hi ${userName}, an admin has updated your profile.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#F2F4F7">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#717680;text-transform:uppercase;letter-spacing:.05em">Field</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#717680;text-transform:uppercase;letter-spacing:.05em">New Value</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="color:#717680;font-size:13px">If you did not expect these changes, please contact your administrator.</p>
    </div>
  `;

  await send({
    to: userEmail,
    subject: 'Your profile has been updated',
    html,
  });
}
