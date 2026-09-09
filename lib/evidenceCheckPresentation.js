// Presentation summary of checker statuses only; never repeats submitted claims or hidden values.
export function evidenceCheckSummary(review) {
 const counts={matched:0,mismatch:0,unavailable:0,unchecked:0};
 for(const claim of review?.claims || []) {
  const key=({matches_released_evidence:'matched',does_not_match_released_evidence:'mismatch',unavailable_for_interpretation:'unavailable'})[claim.status] || 'unchecked';counts[key]++;
 }
 const messages=[];
 if(counts.mismatch)messages.push(`${counts.mismatch} checkable statement${counts.mismatch===1?' does':'s do'} not match the current protected evidence. Please review before export.`);
 else if(counts.matched)messages.push('No contradictions were found in the statements Root can verify against the available organisational evidence.');
 else messages.push('No statements could be automatically verified against the available organisational evidence. This does not verify the document.');
 if(counts.matched)messages.push(`${counts.matched} statement${counts.matched===1?' matches':'s match'} released evidence.`);
 if(counts.unavailable)messages.push(`${counts.unavailable} statement${counts.unavailable===1?' could':'s could'} not be checked because the required evidence is unavailable for organisational interpretation. Protected values are not disclosed.`);
 if(counts.unchecked)messages.push(`${counts.unchecked} narrative statement${counts.unchecked===1?' could':'s could'} not be automatically verified. Recommendations, interpretation, causes, people and unsupported counts or percentages cannot be established by this check. Please review these before export.`);
 return {title:counts.mismatch?'Evidence check needs your attention':'Evidence check complete',attention:counts.mismatch>0,messages};
}
