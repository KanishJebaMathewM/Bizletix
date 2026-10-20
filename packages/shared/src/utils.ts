/**
 * Bizletix Shared Utilities
 */

/**
 * Consistently normalize an email address.
 * Strips whitespace, converts to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validate an email address format strictly.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // Standard RFC 5322 compliant regex for common valid email formats
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Escapes CSV formulas to prevent CSV injection / formula execution in Excel/Sheets.
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', prefix with an apostrophe.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // If string contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Escapes characters for HTML text insertion to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extract all unique merge variable keys (e.g. {{first_name}}) from template text.
 */
export function extractMergeVariables(template: string): string[] {
  if (!template) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }
  return Array.from(matches);
}

export interface RecipientMergeData {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  github_username?: string | null;
  [key: string]: unknown;
}

/**
 * Render personalized string with merge variables.
 * Automatically resolves common aliases like firstName / first_name.
 * Escapes HTML when `escapeForHtml` is true.
 */
export function renderMergeText(
  template: string,
  data: RecipientMergeData,
  options: { escapeForHtml?: boolean; fallbackValue?: string } = {}
): string {
  if (!template) return '';
  const { escapeForHtml = false, fallbackValue = '' } = options;

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const normalizedKey = key.trim();
    let val: unknown = undefined;

    // Check direct match
    if (data[normalizedKey] !== undefined && data[normalizedKey] !== null) {
      val = data[normalizedKey];
    } else {
      // Check alias mappings
      const lowerKey = normalizedKey.toLowerCase();
      if (lowerKey === 'first_name' || lowerKey === 'firstname') {
        val = data.firstName ?? data.first_name;
      } else if (lowerKey === 'last_name' || lowerKey === 'lastname') {
        val = data.lastName ?? data.last_name;
      } else if (lowerKey === 'name') {
        val = data.name ?? (data.firstName ? `${data.firstName} ${data.lastName ?? ''}`.trim() : undefined);
      } else if (lowerKey === 'email') {
        val = data.email;
      } else if (lowerKey === 'company') {
        val = data.company;
      } else if (lowerKey === 'github_username' || lowerKey === 'github') {
        val = data.github_username ?? data['github'];
      }
    }

    if (val === undefined || val === null || val === '') {
      return fallbackValue;
    }

    const valStr = String(val);
    return escapeForHtml ? escapeHtml(valStr) : valStr;
  });
}

/**
 * Check if a destination URL is safe for click redirects.
 * Strictly permits HTTPS (and HTTP if localhost/local dev), rejects dangerous schemes,
 * and rejects private SSRF IP ranges when in production.
 */
export function isValidRedirectUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    // Protocol must be http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Reject data:, javascript:, file:, vbscript:
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) {
      return false;
    }
    // Reject userinfo (@ in credentials)
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Build tracking pixel image tag
 */
export function buildTrackingPixelHtml(trackingBaseUrl: string, token: string): string {
  const cleanBase = trackingBaseUrl.replace(/\/+$/, '');
  const pixelUrl = `${cleanBase}/api/track/open/${encodeURIComponent(token)}.gif`;
  return `\n<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none !important;width:1px !important;height:1px !important;max-height:0 !important;max-width:0 !important;opacity:0 !important;overflow:hidden !important;border:0 !important;margin:0 !important;padding:0 !important;" border="0" />\n`;
}

/**
 * Build standard unsubscribe footer link
 */
export function buildUnsubscribeFooter(
  trackingBaseUrl: string,
  unsubscribeToken: string,
  isHtml: boolean
): string {
  const cleanBase = trackingBaseUrl.replace(/\/+$/, '');
  const unsubUrl = `${cleanBase}/api/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
  if (isHtml) {
    return `\n<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; font-family: sans-serif;">
  <p>You received this email because you are on our mailing list. <a href="${unsubUrl}" style="color: #4b5563; text-decoration: underline;">Unsubscribe</a> to opt out.</p>
</div>\n`;
  }
  return `\n\n---\nTo unsubscribe from these communications, visit:\n${unsubUrl}\n`;
}
