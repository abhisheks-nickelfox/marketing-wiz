import logger from '../config/logger';
import nodemailer from 'nodemailer';
import { FRONTEND_URL } from '../config/constants';

// ── Transporter ───────────────────────────────────────────────────────────────

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = (process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD)?.trim();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_EMAIL    = (process.env.FROM_EMAIL ?? process.env.SMTP_FROM)?.trim() ?? 'noreply@marketingwiz.app';
const FROM_NAME     = (process.env.FROM_NAME ?? 'MarketingWiz').trim();
const FROM          = `${FROM_NAME} <${FROM_EMAIL}>`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() ?? FROM_EMAIL;
const APP_URL       = FRONTEND_URL;

// ── Base layout ───────────────────────────────────────────────────────────────
// Wraps any content with a consistent header (logo + brand bar) and footer
// (support link + unsubscribe note). Templates only supply the inner content.

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${FROM_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#7F56D9;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                      ${FROM_NAME}
                    </span>
                  </td>
                  <td align="right">
                    <a href="${APP_URL}" style="font-size:12px;color:#E9D7FE;text-decoration:none;">
                      Visit dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CONTENT ── -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;border-left:1px solid #E9EAEB;border-right:1px solid #E9EAEB;">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#F2F4F7;border-radius:0 0 12px 12px;border:1px solid #E9EAEB;border-top:none;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#717680;line-height:1.6;">
                    Questions? Reply to this email or contact us at
                    <a href="mailto:${SUPPORT_EMAIL}" style="color:#7F56D9;text-decoration:none;">${SUPPORT_EMAIL}</a>.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;font-size:11px;color:#A4A7AE;">
                    You received this email because you are a member of ${FROM_NAME}.
                    If you believe this is a mistake, please contact your administrator.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Core sendEmail function ───────────────────────────────────────────────────
// Single reusable entry point. Pass raw content HTML — baseTemplate() wraps it
// automatically. Falls back to console logging when SMTP is not configured.

export interface EmailPayload {
  to:      string;
  subject: string;
  html:    string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.info(
      `[email.service] SMTP not configured — would have sent:\n  To: ${payload.to}\n  Subject: ${payload.subject}`,
    );
    return;
  }

  await transporter.sendMail({ from: FROM, ...payload });
}

// ── Pre-built templates ───────────────────────────────────────────────────────
// Each template builds its inner content, wraps it with baseTemplate(), then
// calls sendEmail(). Add new templates below for any new email type.

/** Invite email sent when a user is created with status='invited'. */
export async function sendInviteEmail(
  userEmail: string,
  userName:  string,
  inviteLink: string,
): Promise<void> {
  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      You've been invited!
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 24px;line-height:1.6;">
      Hi${userName ? ` <strong>${userName}</strong>` : ''}, you have been invited to join
      the ${FROM_NAME} team. Click the button below to set up your account.
    </p>

    <a href="${inviteLink}"
      style="display:inline-block;background:#7F56D9;color:#ffffff;text-decoration:none;
             font-weight:600;font-size:14px;padding:13px 28px;border-radius:8px;
             letter-spacing:0.1px;">
      Accept invitation
    </a>

    <p style="font-size:13px;color:#A4A7AE;margin:28px 0 0;line-height:1.6;">
      This link expires in <strong>24 hours</strong>. If you didn't expect this
      invitation, you can safely ignore this email.
    </p>
  `;

  await sendEmail({
    to:      userEmail,
    subject: `You've been invited to ${FROM_NAME} — set up your account`,
    html:    baseTemplate(content),
  });
}

/** Profile-update notification sent when an admin edits a member's profile. */
export interface UpdatedFields {
  name?:        string;
  role?:        string;
  member_role?: string;
  status?:      string;
  skills?:      string[];
}

export async function sendProfileUpdateEmail(
  userEmail: string,
  userName:  string,
  changes:   UpdatedFields,
): Promise<void> {
  const FIELD_LABELS: Record<string, string> = {
    name:        'Name',
    role:        'System Role',
    member_role: 'Job Title',
    status:      'Account Status',
    skills:      'Skills',
  };

  const rows = Object.entries(changes)
    .filter(([, v]) => v !== undefined)
    .map(([key, val]) => {
      const label   = FIELD_LABELS[key] ?? key;
      const display = Array.isArray(val) ? val.join(', ') : String(val);
      return `
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#414651;
                     white-space:nowrap;border-bottom:1px solid #F2F4F7;">${label}</td>
          <td style="padding:10px 14px;font-size:13px;color:#535862;
                     border-bottom:1px solid #F2F4F7;">${display}</td>
        </tr>`;
    })
    .join('');

  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      Your profile was updated
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${userName}</strong>, an admin has made the following changes to your profile.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;border-radius:8px;overflow:hidden;
             border:1px solid #E9EAEB;font-size:13px;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;
                     color:#717680;text-transform:uppercase;letter-spacing:.06em;
                     border-bottom:1px solid #E9EAEB;">Field</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;
                     color:#717680;text-transform:uppercase;letter-spacing:.06em;
                     border-bottom:1px solid #E9EAEB;">New value</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="font-size:13px;color:#A4A7AE;margin:24px 0 0;line-height:1.6;">
      If you did not expect these changes, please contact your administrator.
    </p>
  `;

  await sendEmail({
    to:      userEmail,
    subject: 'Your profile has been updated',
    html:    baseTemplate(content),
  });
}

export async function sendAccountDisabledEmail(
  userEmail: string,
  userName: string,
): Promise<void> {
  const firstName = userName?.trim().split(/\s+/)[0] ?? 'there';

  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      Your account has been disabled
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${firstName}</strong>, your ${FROM_NAME} account has been disabled by an administrator.
    </p>

    <p style="font-size:14px;color:#535862;margin:0;line-height:1.7;">
      If you believe this was done in error or need access restored, please contact your administrator or reply to this email.
    </p>
  `;

  await sendEmail({
    to:      userEmail,
    subject: 'Your account has been disabled',
    html:    baseTemplate(content),
  });
}

/** Password reset email sent when a user requests a password reset. */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetLink: string,
): Promise<void> {
  const firstName = userName?.trim().split(/\s+/)[0] ?? 'there';

  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      Reset your password
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${firstName}</strong>, we received a request to reset your password.
      Click the button below to create a new password.
    </p>

    <a href="${resetLink}"
      style="display:inline-block;background:#7F56D9;color:#ffffff;text-decoration:none;
             font-weight:600;font-size:14px;padding:13px 28px;border-radius:8px;
             letter-spacing:0.1px;">
      Reset password
    </a>

    <p style="font-size:13px;color:#535862;margin:28px 0 8px;line-height:1.6;">
      This link will expire in <strong>1 hour</strong> for security reasons.
    </p>

    <p style="font-size:13px;color:#A4A7AE;margin:0;line-height:1.6;">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>
  `;

  await sendEmail({
    to:      userEmail,
    subject: 'Reset your password',
    html:    baseTemplate(content),
  });
}

/** Welcome email sent when a user completes onboarding and activates their account. */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
): Promise<void> {
  // Use the first word of the full name as the friendly first name
  const firstName = userName.trim().split(/\s+/)[0] ?? userName.trim();

  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      You're officially part of the team!
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 28px;line-height:1.6;">
      Hi <strong>${userName}</strong>, your account setup is complete. You're now ready to
      dive into AI Wealth Management — manage transcripts, review tasks, and collaborate
      with your team.
    </p>

    <a href="${APP_URL}/dashboard"
      style="display:inline-block;background:#7F56D9;color:#ffffff;text-decoration:none;
             font-weight:600;font-size:14px;padding:13px 28px;border-radius:8px;
             letter-spacing:0.1px;">
      Go to Dashboard
    </a>

    <!-- Feature highlights -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin-top:32px;border-collapse:collapse;border-radius:8px;overflow:hidden;
             border:1px solid #E9EAEB;">
      <tbody>
        <tr style="background:#F9FAFB;">
          <td style="padding:14px 16px;width:50%;vertical-align:top;
                     border-right:1px solid #E9EAEB;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#181D27;">
              📋 Transcripts
            </p>
            <p style="margin:0;font-size:13px;color:#535862;line-height:1.5;">
              Import and process meeting transcripts automatically
            </p>
          </td>
          <td style="padding:14px 16px;width:50%;vertical-align:top;
                     background:#F9FAFB;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#181D27;">
              ✅ Tasks
            </p>
            <p style="margin:0;font-size:13px;color:#535862;line-height:1.5;">
              Review, assign and track AI-generated tasks
            </p>
          </td>
        </tr>
      </tbody>
    </table>

    <p style="font-size:12px;color:#A4A7AE;margin:24px 0 0;line-height:1.6;">
      This is an automated message. No action is needed.
    </p>
  `;

  await sendEmail({
    to:      userEmail,
    subject: `Welcome to the team, ${firstName}! 🎉`,
    html:    baseTemplate(content),
  });
}

export async function sendSkillRequestEmail(
  adminEmail: string,
  memberName: string,
  pendingSkills: string[],
): Promise<void> {
  const skillList = pendingSkills
    .map((s) => `<li style="margin:4px 0;font-size:14px;color:#535862;">${s}</li>`)
    .join('');

  const content = `
    <h2 style="font-size:22px;font-weight:700;color:#181D27;margin:0 0 8px;">
      New skill request
    </h2>
    <p style="font-size:15px;color:#535862;margin:0 0 20px;line-height:1.6;">
      <strong>${memberName}</strong> completed their onboarding and requested the following
      skills to be added to the catalog:
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      ${skillList}
    </ul>
    <p style="font-size:14px;color:#535862;margin:0 0 24px;line-height:1.6;">
      Please review these and add the relevant skills via the admin panel so the member can
      select them from their profile.
    </p>
    <a href="${APP_URL}/settings"
      style="display:inline-block;background:#7F56D9;color:#ffffff;text-decoration:none;
             font-weight:600;font-size:14px;padding:13px 28px;border-radius:8px;">
      Go to Settings
    </a>
    <p style="font-size:12px;color:#A4A7AE;margin:24px 0 0;line-height:1.6;">
      This is an automated message sent because a team member requested new skills during onboarding.
    </p>
  `;

  await sendEmail({
    to:      adminEmail,
    subject: `Skill request from ${memberName}`,
    html:    baseTemplate(content),
  });
}
