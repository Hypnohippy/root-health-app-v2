/**
 * Establish whether acceptance evidence identifies the named contact, or an
 * explicitly authorised representative of the named introducer organisation.
 * Never confuse an email match alone with signature authority.
 *
 * A representative's attestation is evidence of claimed authority, not
 * independent legal verification. The signed role and organisation remain
 * preserved in the immutable acceptance record for later review.
 */
const normal = value => String(value || "").trim().replace(/\s+/g," ").toLocaleLowerCase("en-GB");
export function introducerSignerMatchesTerms(terms, evidence) {
  const name=normal(evidence?.full_name);
  const namedContact=normal(terms?.contact_name);
  if (!name || !namedContact) return false;
  if (name===namedContact) return true;
  const organisation=normal(terms?.introducer_name);
  return Boolean(
    organisation && normal(evidence?.organisation)===organisation &&
    String(evidence?.role || "").trim() &&
    evidence?.authority===true &&
    evidence?.authority_text &&
    evidence?.confirmed===true
  );
}
