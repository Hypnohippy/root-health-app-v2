export function canUseCorporateOutput(entry) {
  return entry?.role === 'assistant' && !entry.interrupted && !entry.transcriptionFailed &&
    (!entry.voiceSessionId || entry.final === true) && typeof entry.content === 'string' && entry.content.trim().length >= 120;
}
export function actionDraftFromResponse(entry) {
  return { title: entry.content.split('\n').find(line => line.trim())?.replace(/^#+\s*/, '').slice(0, 200) || 'Organisation action',
    type: 'action_plan', rationale: '', evidence_summary: entry.content.slice(0, 4000), owner: '',
    review_date: '', expected_outcome: '', success_measure: '', status: 'planned',
    source: entry.voiceSessionId ? 'realtime' : 'ask_root', source_reference: String(entry.id || '').slice(0, 500) };
}
export async function saveReviewedAction({ access, draft, confirmed, fetchImpl = fetch }) {
  if (confirmed !== true) throw new Error('Review and confirm the action first.');
  const response = await fetchImpl(`/api/organisation/actions?organisation_id=${encodeURIComponent(access.organisationId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.accessToken}` },
    body: JSON.stringify({ confirmed: true, action: { ...draft, review_date: draft.review_date || null } }),
  });
  if (!response.ok) throw new Error('Action could not be saved. Check the fields before trying again.');
  return response.json();
}
