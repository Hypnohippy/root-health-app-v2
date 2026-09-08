export const ACTION_FILTERS = [['', 'All'], ['planned', 'Planned'], ['in_progress', 'In Progress'], ['in_review', 'In Review'], ['completed', 'Completed']];
export async function loadActionPanel({ accessToken, organisationId, signal, fetchImpl = fetch }) {
  if (!accessToken || !organisationId) throw new Error('Authorised organisation required');
  const pages = await Promise.all(ACTION_FILTERS.map(async ([status]) => {
    const params = new URLSearchParams({ organisation_id: organisationId, limit: '5' });
    if (status) params.set('status', status);
    const response = await fetchImpl(`/api/organisation/actions?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Actions unavailable');
    const page = await response.json();
    if (!Array.isArray(page.actions) || page.actions.length > 5 || page.actions.some(a => a.organisation_id !== organisationId)) throw new Error('Invalid action scope');
    return [status, page];
  }));
  return Object.fromEntries(pages);
}
