// This RPC exposes aggregates, never workforce identities. Failure is not an empty roster.
export async function loadWorkforceContext(supabase, organisationId) {
  const { data, error } = await supabase.rpc("organisation_workforce_context", {
    p_organisation_id: organisationId,
  });
  if (error || !data || data.organisationId !== organisationId) {
    throw new Error("The authorised workforce context is unavailable.");
  }
  return {
    ...data,
    denominators: {
      recordedActiveWorkforce: data.hasRecordedRoster ? data.activeWorkforceCount : null,
      rootMemberships: data.rootMembershipCount,
      authenticatedRootMemberships: data.authenticatedMembershipCount,
      linkedJoinedWorkforce: data.joinedCount,
      wellbeing: "Distinct valid baseline participants; matched participants for longitudinal evidence",
    },
  };
}

export async function withWorkforceContext(supabase, organisation) {
  if (!organisation?.id) throw new Error("An organisation is required.");
  return { ...organisation, workforceContext: await loadWorkforceContext(supabase, organisation.id) };
}

export function workforceDenominator(organisation) {
  const context = organisation?.workforceContext;
  if (context?.hasRecordedRoster) {
    return { value: context.activeWorkforceCount, source: "recorded active workforce", completeness: context.completeness };
  }
  const estimate = Number(organisation?.workforce_size);
  return { value: estimate > 0 ? estimate : null, source: "legacy workforce estimate (no recorded roster)", completeness: "not established" };
}
