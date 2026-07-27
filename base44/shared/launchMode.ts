/**
 * LAUNCH_MODE is a single admin-editable AppSetting row, so the commercial mode can be
 * flipped without a code change. Missing row means the launch default, free_preview.
 */
export const DEFAULT_LAUNCH_MODE = 'free_preview';
export const FREE_PREVIEW_EMAIL_LIMIT = 1;
export const FREE_PREVIEW_IP_DAILY_LIMIT = 3;
export const FREE_EMAIL_USED_MESSAGE = 'Free analysis used - additional reports coming soon.';

export async function getLaunchMode(base44) {
  try {
    const [row] = await base44.asServiceRole.entities.AppSetting.filter(
      { key: 'LAUNCH_MODE' },
      '-updated_date',
      1
    );
    return row?.value === 'paid' ? 'paid' : DEFAULT_LAUNCH_MODE;
  } catch (_e) {
    return DEFAULT_LAUNCH_MODE;
  }
}

export function clientIp(req) {
  return (
    req.headers.get('cf-connecting-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}