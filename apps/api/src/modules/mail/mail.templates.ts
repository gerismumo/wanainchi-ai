import { Injectable } from '@nestjs/common';
import { ENV } from 'src/common/config/env.config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#5478FF';
const DARK = '#111111';
const BORDER = '#e8e8e8';
const BG = '#fafafa';
const TEXT = '#444444';
const MUTED = '#777777';
const WHITE = '#ffffff';
const SUCCESS = '#2d6a4f';
const DANGER = '#9b2335';
const WARNING = '#7d5a00';
const INFO = '#1a3a5c';

// ─── Responsive stylesheet (used by every template via layout()) ──────────────
// Inline styles remain as the fallback for clients that strip <style> blocks
// (e.g. some webmail rewrites); the media query below overrides them with
// !important for clients that do honor <style> in <head> — which covers the
// mobile Gmail/Apple Mail/Outlook apps this was breaking on.
const RESPONSIVE_STYLE = `
<style>
  body { margin:0; -webkit-text-size-adjust:100%; text-size-adjust:100%; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  * { box-sizing:border-box; }

  /* Tablet / narrow desktop */
  @media only screen and (max-width: 680px) {
    .pce-container { width:100% !important; border-radius:8px !important; }
  }

  /* Phones */
  @media only screen and (max-width: 600px) {
    .pce-body        { padding:12px 6px !important; }
    .pce-container   { border-radius:8px !important; }

    .pce-header      { padding:14px 16px !important; }
    .pce-header-table td { display:block !important; width:100% !important; text-align:left !important; }
    .pce-header-title { font-size:17px !important; }
    .pce-header-sub   { font-size:9px !important; }
    .pce-header-date  { margin-top:6px !important; text-align:left !important; font-size:10px !important; }

    .pce-content     { padding:18px 14px !important; }
    .pce-content h2  { font-size:16px !important; }

    .pce-footer      { padding:14px 16px !important; }
    .pce-footer p    { font-size:10px !important; }

    /* KPI cards stack full-width, one per row, with breathing room */
    .pce-kpi-table, .pce-kpi-table tbody, .pce-kpi-table tr {
      display:block !important; width:100% !important;
    }
    .pce-kpi-cell {
      display:block !important;
      width:100% !important;
      padding:0 0 8px 0 !important;
    }
    .pce-kpi-cell:last-child { padding-bottom:0 !important; }
    .pce-kpi-box      { padding:12px !important; }
    .pce-kpi-value    { font-size:18px !important; }

    /* CTA buttons go full width and stay tappable */
    .pce-btn { display:block !important; width:100% !important; text-align:center !important; }

    /* Section labels */
    .pce-section-label { font-size:10px !important; letter-spacing:1px !important; }

    /* Data tables: keep horizontal scroll, but tighten cell padding so more
       columns are visible before the user has to scroll */
    .pce-th, .pce-td  { padding:7px 8px !important; font-size:11.5px !important; }

    /* Card-style key/value rows (used by expense summaries) collapse to a
       single stacked column with the label shown inline for context */
    .pce-card-row     { display:block !important; width:100% !important; padding:8px 0 !important; border-bottom:1px solid ${BORDER}; }
    .pce-card-row:last-child { border-bottom:none !important; }
  }

  /* Very small phones */
  @media only screen and (max-width: 360px) {
    .pce-content      { padding:14px 10px !important; }
    .pce-kpi-value    { font-size:16px !important; }
    .pce-header-title { font-size:15px !important; }
  }
</style>`;

@Injectable()
export class MailTemplates {
  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED LAYOUT  — single source of truth for all emails
  // ═══════════════════════════════════════════════════════════════════════════

  layout(content: string, preheader = ''): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="format-detection" content="telephone=no"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<!--[if mso]>
<noscript>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
</noscript>
<style>table,td,div,h1,p { font-family: Arial, sans-serif; }</style>
<![endif]-->
${RESPONSIVE_STYLE}
</head>
<body class="pce-body" style="margin:0;padding:32px 16px;font-family:Arial,sans-serif;background:#f4f4f4;color:${DARK};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preheader}&nbsp;</div>` : ''}
<div class="pce-container" style="max-width:660px;margin:auto;background:${WHITE};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">

  <!-- HEADER -->
  <div class="pce-header" style="padding:18px 28px;background:${DARK};border-bottom:3px solid ${PRIMARY};">
    <table class="pce-header-table" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <div class="pce-header-title" style="font-size:21px;font-weight:800;color:${PRIMARY};letter-spacing:1px;">Wananchi Ai</div>
          <div class="pce-header-sub" style="font-size:10px;color:#aaa;margin-top:2px;letter-spacing:2px;text-transform:uppercase;">Sales Intelligence</div>
        </td>
        <td class="pce-header-date" align="right" style="font-size:11px;color:#666;">
          ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </td>
      </tr>
    </table>
  </div>

  <!-- BODY -->
  <div class="pce-content" style="padding:32px 28px;">
    ${content}
  </div>

  <!-- FOOTER -->
  <div class="pce-footer" style="background:${BG};border-top:1px solid ${BORDER};padding:18px 28px;text-align:center;">
    <p style="margin:0;color:${MUTED};font-size:11px;line-height:1.8;">
      &copy; ${new Date().getFullYear()} Wananchi Ai. All rights reserved.
    </p>
  </div>

</div>
</body>
</html>`;
  }

  private infoBox(content: string, color: string): string {
    return `<div style="border-left:4px solid ${color};padding:11px 14px;background:${color}11;border-radius:0 6px 6px 0;margin:14px 0;">${content}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  resetRequest(data: {
    email: string;
    token: string;
    type: 'password' | 'pin';
  }) {
    const resetUrl = `${ENV.FRONTEND_URL}/auth/reset-${data.type}?token=${data.token}`;
    const label = data.type === 'password' ? 'Password' : 'PIN';

    return {
      subject: `${label} Reset Request`,
      html: this.layout(
        `
        <h2 style="margin:0 0 16px;color:${DARK};font-size:18px;">${label} Reset</h2>
        <p style="line-height:1.8;color:${TEXT};font-size:14px;margin:0 0 24px;">
          We received a request to reset your account ${data.type === 'password' ? 'password' : 'security PIN'}.
          Click the button below to proceed.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" class="pce-btn" style="display:inline-block;background:${PRIMARY};color:${DARK};padding:13px 30px;border-radius:7px;text-decoration:none;font-weight:700;font-size:14px;">
            Reset ${label}
          </a>
        </div>
        <p style="color:${MUTED};font-size:12px;line-height:1.7;margin:0 0 8px;">This link expires in 24 hours.</p>
        <p style="color:${MUTED};font-size:12px;line-height:1.7;margin:0;">If you did not request this, you can safely ignore this email.</p>
      `,
        `Reset your ${label.toLowerCase()} — link expires in 24 hours.`,
      ),
    };
  }

  passwordChanged(data: { name: string; email: string }) {
    return {
      subject: 'Password Changed Successfully',
      html: this.layout(
        `
        <h2 style="margin:0 0 16px;color:${DARK};font-size:18px;">Password Updated</h2>
        <p style="line-height:1.8;color:${TEXT};margin:0 0 8px;">Hello ${data.name},</p>
        <p style="line-height:1.8;color:${TEXT};margin:0 0 20px;">Your account password was successfully changed.</p>
        ${this.infoBox(`<p style="margin:0;color:${TEXT};font-size:13px;line-height:1.7;">If you did not perform this action, please reset your password immediately or contact support.</p>`, PRIMARY)}
        <p style="margin:28px 0 0;color:#555;font-size:13px;">Regards,<br/><strong>Wananchi Ai Security Team</strong></p>
      `,
        'Your password was changed successfully.',
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DAILY SALES SUMMARY  (admin, 6 PM EAT)
  // ═══════════════════════════════════════════════════════════════════════════
}
