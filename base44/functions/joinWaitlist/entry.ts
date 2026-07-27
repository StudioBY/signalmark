import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Waitlist.filter({ email: clean }, '-created_date', 1);
    if (existing.length === 0) {
      await base44.asServiceRole.entities.Waitlist.create({ email: clean });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('joinWaitlist failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}