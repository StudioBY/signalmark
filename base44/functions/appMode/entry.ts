import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getLaunchMode, DEFAULT_LAUNCH_MODE } from '../../shared/launchMode.ts';

/** Public: tells the frontend which commercial mode to render. */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    return Response.json({ launch_mode: await getLaunchMode(base44) });
  } catch (error) {
    console.error('appMode failed', error);
    return Response.json({ launch_mode: DEFAULT_LAUNCH_MODE });
  }
}