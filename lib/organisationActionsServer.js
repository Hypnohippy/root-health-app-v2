import { requireHRCoachOrganisationAccess, HRCoachAccessError } from './hrCoachServerAuth.js';
import { ACTION_FIELDS, listOrganisationActions, validateAction } from './organisationActions.js';

export function createOrganisationActionsHandler({ authorise = requireHRCoachOrganisationAccess } = {}) {
  return async function handle(request) {
    try {
      const url = new URL(request.url);
      const access = await authorise({ request, organisationId: url.searchParams.get('organisation_id') });
      const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
      if (request.method === 'GET') return reply(await listOrganisationActions({ supabase: access.supabase, organisationId: access.organisationId,
        offset: Number(url.searchParams.get('offset') || 0), limit: Number(url.searchParams.get('limit') || 50), status: url.searchParams.get('status') || undefined }));
      if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
      const body = await request.json();
      let query;
      if (request.method === 'POST') {
        // Future assistant save UI must obtain this from an explicit human click;
        // no model tool or automatic save interaction is exposed here.
        if (body.confirmed !== true) return reply({ error: 'Explicit human confirmation required' }, 400);
        const row = validateAction(body.action, true);
        query = access.supabase.from('organisation_actions').insert({ ...row, organisation_id: access.organisationId, created_by: access.user.id, human_confirmed: true });
      } else {
        if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return reply({ error: 'Action ID required' }, 400);
        query = request.method === 'PATCH' ? access.supabase.from('organisation_actions').update(validateAction(body.action)) : access.supabase.from('organisation_actions').delete();
        query = query.eq('organisation_id', access.organisationId).eq('id', body.id);
      }
      const { data, error } = await query.select(ACTION_FIELDS).maybeSingle();
      if (error) return reply({ error: 'Action could not be saved' }, 400);
      if (!data) return reply({ error: 'Action not found' }, 404);
      return reply({ action: data }, request.method === 'POST' ? 201 : 200);
    } catch (error) {
      const status = error instanceof HRCoachAccessError ? error.status : 400;
      return Response.json({ error: status === 401 ? 'Authentication required' : status === 403 ? 'Organisation admin or HR admin access required' : 'Action request could not be processed' }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
