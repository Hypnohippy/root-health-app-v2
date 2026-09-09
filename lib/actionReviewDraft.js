// Presentation-only extraction. Unlabelled prose is not treated as evidence.
export function prepareActionReview(entry) {
  const sections = {};
  let current = null;
  const names = { 'action title': 'title', 'recommendation': 'title', 'recommended action': 'title', 'recommended next step': 'title', 'proposed action': 'title', 'rationale': 'rationale', 'why this matters': 'rationale', 'reason': 'rationale', 'why are we doing this?': 'rationale', 'expected outcome': 'expected_outcome', 'intended outcome': 'expected_outcome', 'success measure': 'success_measure', 'measure of success': 'success_measure', 'how will we know it worked?': 'success_measure', 'type': 'type' };
  for (const raw of entry.content.split(/\r?\n/)) {
    const line = raw.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    const heading = (colon >= 0 ? line.slice(0, colon) : line).toLowerCase();
    if (names[heading]) { current = names[heading]; sections[current] = colon >= 0 ? line.slice(colon + 1).trim() : ''; }
    else if (current === 'title' && !sections.title && !/^\s*#/.test(raw) && !/^[\w ?]+:/.test(line)) { sections.title = line; current = null; }
    else if (/^\s*#{1,6}\s+(?:Increase|Improve|Review|Agree|Assign|Reduce|Establish|Update|Invite)\b/i.test(raw)) { sections.title ||= line; current = null; }
    else if (current && !['title','type'].includes(current) && line && !/^#{1,6}\s/.test(raw) && !/^[\w ?]+:/.test(line)) sections[current] += `${sections[current] ? '\n' : ''}${line}`;
    else current = null;
  }
  // Only use the existing protected handoff for the evidence field. Never copy
  // arbitrary response text, Learning notes or inferred contributor counts here.
  let evidenceSummary = '';
  try {
    if (entry.documentHandoff?.reference) {
      const evidence = JSON.parse(entry.documentHandoff.content);
      const labels = { stress_score: 'Stress', burnout_score: 'Burnout', sleep_score: 'Sleep', recovery_score: 'Recovery', mood_score: 'Mood', focus_score: 'Focus' };
      const rows = [];
      for (const [key, field, description] of [['baselineLevels', 'mean', 'recorded baseline average'], ['matchedLongitudinalChange', 'change', 'recorded matched change']]) {
        for (const row of evidence[key] || []) if (labels[row.metric] && new RegExp(`\\b${labels[row.metric]}\\b`, 'i').test(entry.content) && row.suppressed === false && Number.isFinite(row[field])) rows.push(`${labels[row.metric]} ${description}: ${row[field]}.`);
      }
      evidenceSummary = rows.join('\n');
    }
  } catch { /* No trusted structured evidence available for prefill. */ }
  // Only explicitly labelled owner and ISO dates are copied; never resolve relative dates.
  const explicit = {};
  for (const raw of entry.content.split(/\r?\n/)) {
    const match = raw.replace(/\*\*/g,'').trim().match(/^(Owner|Start date|Review date):\s*(.+)$/i);
    if(match) explicit[match[1].toLowerCase()] = match[2].trim();
  }
  const date = key => /^\d{4}-\d{2}-\d{2}$/.test(explicit[key] || '') && Number.isFinite(Date.parse(explicit[key])) && new Date(explicit[key]).toISOString().slice(0,10) === explicit[key] ? explicit[key] : null;
  return { title: (sections.title || 'Organisation action').slice(0, 200),
    type: ({ intervention: 'intervention', decision: 'decision', 'action plan': 'action_plan' })[sections.type?.toLowerCase()] || 'action_plan',
    rationale: (sections.rationale || '').slice(0, 4000), evidence_summary: evidenceSummary.slice(0, 4000),
    expected_outcome: (sections.expected_outcome || '').slice(0, 4000), success_measure: (sections.success_measure || '').slice(0, 4000),
    owner: (explicit.owner || '').slice(0,200), status: 'planned', start_date: date('start date'), review_date: date('review date'), completed_date: null,
    source: entry.voiceSessionId ? 'realtime' : 'ask_root', source_reference: String(entry.id || '').slice(0, 500) };
}
