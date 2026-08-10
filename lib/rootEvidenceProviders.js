function provider(
  id,
  name,
  priority,
  domains,
  description
) {
  return {
    id,
    name,
    priority,
    domains,
    description,
  };
}

export const ROOT_EVIDENCE_PROVIDERS = [

  provider(
    "root_org",
    "Root Organisation Evidence",
    100,
    [
      "organisation",
      "culture",
      "burnout",
      "engagement",
      "assessment",
      "journal",
      "mind",
      "body",
      "voice",
      "executive"
    ],
    "Evidence already collected from the organisation."
  ),

  provider(
    "internal_policy",
    "Organisation Policies",
    98,
    [
      "disciplinary",
      "grievance",
      "absence",
      "capability",
      "performance",
      "flexible working",
      "redundancy",
      "monitoring",
      "privacy"
    ],
    "Internal organisational policy."
  ),

  provider(
    "acas",
    "ACAS",
    95,
    [
      "employment",
      "dismissal",
      "grievance",
      "disciplinary",
      "absence",
      "capability",
      "consultation",
      "redundancy"
    ],
    "UK employment guidance."
  ),

  provider(
    "gov",
    "GOV.UK",
    94,
    [
      "employment",
      "government",
      "statutory"
    ],
    "Official UK Government guidance."
  ),

  provider(
    "legislation",
    "UK Legislation",
    96,
    [
      "law",
      "legal"
    ],
    "Current legislation."
  ),

  provider(
    "ico",
    "Information Commissioner's Office",
    95,
    [
      "privacy",
      "gdpr",
      "monitoring",
      "personal data"
    ],
    "Privacy and data protection."
  ),

  provider(
    "ehrc",
    "Equality & Human Rights Commission",
    95,
    [
      "disability",
      "equality",
      "reasonable adjustments",
      "protected characteristics"
    ],
    "Equality guidance."
  ),

  provider(
    "hse",
    "Health & Safety Executive",
    94,
    [
      "health",
      "stress",
      "burnout",
      "workplace safety"
    ],
    "Health and safety."
  ),

  provider(
    "nice",
    "NICE",
    92,
    [
      "mental health",
      "clinical",
      "health"
    ],
    "Clinical guidance."
  ),

  provider(
    "cipd",
    "CIPD",
    85,
    [
      "people management",
      "leadership",
      "organisation"
    ],
    "Professional HR practice."
  )

];

export function
selectEvidenceProviders(
  verificationDecision
) {

  if (
    !verificationDecision
      ?.shouldVerify
  ) {
    return [];
  }

  const providers = [];

  const dimensions =
    verificationDecision
      .dimensions || {};

  if (
    dimensions.employment > 0
  ) {

    providers.push(
      "acas",
      "gov",
      "legislation"
    );

  }

  if (
    dimensions.health > 0
  ) {

    providers.push(
      "ehrc",
      "nice",
      "hse"
    );

  }

  if (
    dimensions.privacy > 0
  ) {

    providers.push(
      "ico",
      "gov"
    );

  }

  if (
    dimensions.policy > 0
  ) {

    providers.push(
      "internal_policy"
    );

  }

  if (
    verificationDecision
      .organisationalImpact >
    0
  ) {

    providers.push(
      "root_org"
    );

  }

  const unique =
    [...new Set(providers)];

  return unique
    .map(id =>
      ROOT_EVIDENCE_PROVIDERS.find(
        provider =>
          provider.id === id
      )
    )
    .filter(Boolean)
    .sort(
      (a,b)=>
        b.priority-
        a.priority
    );

}
