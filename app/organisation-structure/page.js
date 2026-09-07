"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import RootModal from "../../components/workplace/RootModal";
import WorkforceImportPreview from "../../components/workplace/WorkforceImportPreview";
import { getRootIdentity } from "../../lib/rootIdentity";
import { supabase } from "../../lib/supabase";

const UNIT_TYPES = [
  ["department", "Department"],
  ["region", "Region"],
  ["country", "Country"],
  ["division", "Division"],
  ["business_unit", "Business Unit"],
  ["function", "Function"],
  ["site", "Site"],
  ["team", "Team"],
  ["other", "Other"],
];

function unitTypeLabel(value) {
  return UNIT_TYPES.find(([key]) => key === value)?.[1] || value || "Organisational Unit";
}

function memberRoleLabel(role) {
  if (role === "organisation_admin") return "Organisation Admin";
  if (role === "hr_admin") return "HR Administrator";
  if (role === "unit_admin") return "Unit Administrator";
  return "Employee";
}

function StructureBranch({
  unit,
  units,
  members,
  depth = 0,
  onOpen,
}) {
  const children = units.filter((item) => item.parent_unit_id === unit.id);
  const assigned = members.filter((member) => member.organisation_unit_id === unit.id);

  return (
    <div className="branch" style={{ "--depth": depth }}>
      <button className="unitCard" type="button" onClick={() => onOpen(unit)}>
        <span className="unitIcon">{unit.unit_type === "team" ? "◌" : "⌂"}</span>
        <span className="unitCopy">
          <strong>{unit.name}</strong>
          <small>{unitTypeLabel(unit.unit_type)}</small>
        </span>
        <span className="unitCounts">
          {assigned.length} {assigned.length === 1 ? "person" : "people"}
          {children.length > 0 ? ` · ${children.length} beneath` : ""}
        </span>
      </button>

      {children.length > 0 ? (
        <div className="children">
          {children.map((child) => (
            <StructureBranch
              key={child.id}
              unit={child}
              units={units}
              members={members}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OrganisationStructurePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organisation, setOrganisation] = useState(null);
  const [membership, setMembership] = useState(null);
  const [units, setUnits] = useState([]);
  const [members, setMembers] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [showWorkforceImport, setShowWorkforceImport] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState("department");
  const [newUnitParentId, setNewUnitParentId] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitError, setUnitError] = useState("");
  const [copied, setCopied] = useState(false);
  const [workforceRows, setWorkforceRows] = useState([]);
  const [workforceSearch, setWorkforceSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [invitationCounts, setInvitationCounts] = useState({});
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationPage, setInvitationPage] = useState({ next: null, trail: [], total: 0, cutoff: null });
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationLoadError, setInvitationLoadError] = useState("");
  const invitationRequest = useRef(0);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage(showPageLoading = true) {
    if (showPageLoading) setLoading(true);
    setError("");

    const identity = await getRootIdentity();
    if (!identity) {
      window.location.href = "/login";
      return;
    }

    const activeMembership = identity.workplace?.activeOrganisation || null;
    if (!activeMembership || activeMembership.role !== "organisation_admin") {
      window.location.href = activeMembership ? "/org-insights" : "/choose-organisation";
      return;
    }

    const organisationId = activeMembership.organisation_id;
    setMembership(activeMembership);

    const [organisationResult, unitResult, memberResult, peopleResult] = await Promise.all([
      supabase.from("organisations").select("*").eq("id", organisationId).maybeSingle(),
      supabase
        .from("organisation_units")
        .select("id, organisation_id, name, unit_type, parent_unit_id, active, created_by, created_at")
        .eq("organisation_id", organisationId)
        .order("name", { ascending: true }),
      supabase
        .from("organisation_members")
        .select("id, organisation_id, organisation_unit_id, user_id, profile_key, email, name, department, role, activated_at, created_at")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("organisation_people")
        .select("id, organisation_id, organisation_member_id, organisation_unit_id, manager_person_id, employee_reference_id, name, business_email, job_title, location, workforce_status, source, last_confirmed_at")
        .eq("organisation_id", organisationId)
        .order("name", { ascending: true }),
    ]);

    const loadError = organisationResult.error || unitResult.error || memberResult.error || peopleResult.error;
    if (loadError || !organisationResult.data) {
      setError(loadError?.message || "Root could not load this organisation structure.");
      setLoading(false);
      return;
    }

    setOrganisation(organisationResult.data);
    setUnits(Array.isArray(unitResult.data) ? unitResult.data : []);
    setMembers(Array.isArray(memberResult.data) ? memberResult.data : []);
    setPeople(Array.isArray(peopleResult.data) ? peopleResult.data : []);
    if (activeMembership.role === "organisation_admin") {
      const cutoff = new Date().toISOString();
      const invitationResult = await supabase.rpc("list_workforce_invitations", { p_org: organisationId, p_search: "", p_status: "all", p_after: null, p_limit: 100, p_cutoff: cutoff, p_eligible_only: false });
      if (!invitationResult.error) {
        setWorkforceRows(invitationResult.data?.rows || []);
        setInvitationCounts(invitationResult.data?.counts || {});
        setInvitationPage({ next: invitationResult.data?.next_cursor || null, trail: [], total: invitationResult.data?.total || 0, cutoff });
      } else { setInvitationLoadError("Root could not load the workforce list. Please try again."); }
    }
    setLoading(false);
  }

  async function refreshInvitations(search = workforceSearch, trail = [], cutoff = new Date().toISOString()) {
    if (!organisation?.id) return;
    const requestId = ++invitationRequest.current;
    setInvitationLoading(true);
    setInvitationLoadError("");
    try {
      const result = await supabase.rpc("list_workforce_invitations", { p_org: organisation.id, p_search: search, p_status: "all", p_after: trail.at(-1) || null, p_limit: 100, p_cutoff: cutoff, p_eligible_only: false });
      if (requestId !== invitationRequest.current) return;
      if (result.error) throw result.error;
      setWorkforceRows(result.data?.rows || []);
      setInvitationCounts(result.data?.counts || {});
      setInvitationPage({ next: result.data?.next_cursor || null, trail, total: result.data?.total || 0, cutoff });
    } catch {
      if (requestId === invitationRequest.current) setInvitationLoadError("Root could not load the workforce list. Please try again.");
    } finally {
      if (requestId === invitationRequest.current) setInvitationLoading(false);
    }
  }

  async function sendInvitations() {
    const ids = [...selectedPeople];
    if (!ids.length || !organisation?.id) return;
    setSendingInvitations(true); setInvitationMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/organisation/workforce-invitations", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ organisation_id: organisation.id, person_ids: ids }) });
    const result = await response.json();
    setInvitationMessage(response.ok ? `${(result.results || []).filter((item) => item.status === "sent").length} invitation(s) sent.` : (result.error || "Root could not send invitations."));
    setSelectedPeople(new Set()); setSendingInvitations(false); refreshInvitations();
  }

  const rootUnits = useMemo(
    () => units.filter((unit) => !unit.parent_unit_id),
    [units]
  );

  const assignedMemberCount = members.filter((member) => member.organisation_unit_id).length;
  const activePeople = people.filter((person) => person.workforce_status === "active");
  const linkedMemberIds = new Set(activePeople.map((person) => person.organisation_member_id).filter(Boolean));
  const displayedPeople = [...activePeople, ...members.filter((member) => !linkedMemberIds.has(member.id))];
  const assignedPeopleCount = displayedPeople.filter((person) => person.organisation_unit_id).length;
  const departmentCount = units.filter((unit) => unit.unit_type === "department").length;
  const teamCount = units.filter((unit) => unit.unit_type === "team").length;
  const siteCount = units.filter((unit) => ["site", "region", "country"].includes(unit.unit_type)).length;

  function openCreateUnit(parentId = "") {
    setNewUnitName("");
    setNewUnitType("department");
    setNewUnitParentId(parentId);
    setUnitError("");
    setSelectedUnit(null);
    setShowUnitModal(true);
  }

  async function createOrganisationUnit() {
    setUnitError("");
    if (membership?.role !== "organisation_admin") {
      setUnitError("Only the Organisation Admin can create organisational units.");
      return;
    }

    const cleanName = newUnitName.trim();
    if (!cleanName) {
      setUnitError("Please enter a name for this organisational unit.");
      return;
    }

    const validType = UNIT_TYPES.some(([key]) => key === newUnitType);
    const parent = newUnitParentId
      ? units.find((unit) => unit.id === newUnitParentId)
      : null;

    if (!validType || (newUnitParentId && !parent)) {
      setUnitError("Root could not verify this organisational unit.");
      return;
    }

    setCreatingUnit(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setUnitError("Root could not verify your signed-in account.");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("organisation_units")
        .insert({
          organisation_id: organisation.id,
          name: cleanName,
          unit_type: newUnitType,
          parent_unit_id: newUnitParentId || null,
          active: true,
          created_by: user.id,
        })
        .select("id, organisation_id, name, unit_type, parent_unit_id, active, created_by, created_at")
        .single();

      if (insertError || !data) {
        setUnitError(
          insertError?.code === "23505"
            ? "A unit with this name already exists in that part of the organisation."
            : insertError?.message || "Root could not create this organisational unit."
        );
        return;
      }

      setUnits((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowUnitModal(false);
    } finally {
      setCreatingUnit(false);
    }
  }

  async function copyJoinLink() {
    const code = organisation?.organisation_code || "";
    const link = `${window.location.origin}/organisation/join${code ? `?code=${encodeURIComponent(code)}` : ""}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setShowPeoplePanel(true);
    }
  }

  const selectedMembers = selectedUnit
    ? displayedPeople.filter((person) => person.organisation_unit_id === selectedUnit.id)
    : [];

  if (loading) {
    return (
      <RootAtmosphere type="coach">
        <Nav />
        <main className="loadingPage">Loading organisation structure…</main>
        <style jsx>{pageStyles}</style>
      </RootAtmosphere>
    );
  }

  return (
    <RootAtmosphere type="coach">
      <Nav />
      <main className="page">
        <section className="shell">
          <a className="backLink" href="/organisation-learning">
            ← Back to Organisation Learning
          </a>
          <header className="hero">
            <div>
              <p className="kicker">Root Workplace</p>
              <h1>Organisation Structure &amp; People</h1>
              <p className="intro">This is where you add your people and organise them into the right departments and teams.</p>
            </div>
            <div className="heroMark">
              <RootEnso size={78} />
              <span>{organisation?.name}</span>
              <small>Organisation Admin</small>
            </div>
          </header>

          {error ? <div className="errorCard">{error}</div> : null}

          <section className="actionGrid" aria-label="Organisation setup actions">
            <button type="button" className="actionCard" onClick={() => setShowPeoplePanel((value) => !value)}>
              <span className="actionIcon">＋</span>
              <strong>Add people</strong>
              <small>Invite employees into this organisation</small>
            </button>
            <button type="button" className="actionCard" onClick={() => setShowWorkforceImport(true)}>
              <span className="actionIcon">▦</span>
              <strong>Upload staff spreadsheet</strong>
              <small>Map and preview your existing workforce export</small>
            </button>
            <button type="button" className="actionCard primary" onClick={() => openCreateUnit()}>
              <span className="actionIcon">⌘</span>
              <strong>Build structure</strong>
              <small>Add a department, team, site or business unit</small>
            </button>
          </section>

          {showWorkforceImport ? (
            <WorkforceImportPreview
              organisationId={organisation?.id}
              existingMembers={members}
              onApplied={() => loadPage(false)}
              onClose={() => setShowWorkforceImport(false)}
            />
          ) : null}

          {showPeoplePanel ? (
            <section className="inviteCard workforcePanel" aria-labelledby="workforce-invite-title">
              <header className="workforceHeading">
                <p className="sectionLabel">Workforce invitations</p>
                <h2 id="workforce-invite-title">Invite workforce</h2>
                <p>Send secure, personalised invitations to approved business email addresses. Employee invitations always create employee access.</p>
              </header>
              <div className="workforceToolbar">
                <label className="workforceSearch">
                  <span>Search workforce</span>
                  <input type="search" placeholder="Name, business email or placement" value={workforceSearch} onChange={(event) => { setWorkforceSearch(event.target.value); refreshInvitations(event.target.value); }} />
                </label>
                <dl className="workforceCounts" aria-label="Invitation counts for this search">
                  <div><dt>Not invited</dt><dd>{(invitationCounts.not_invited || 0).toLocaleString()}</dd></div>
                  <div><dt>Invitation sent</dt><dd>{(invitationCounts.sent || 0).toLocaleString()}</dd></div>
                  <div><dt>Joined</dt><dd>{(invitationCounts.joined || 0).toLocaleString()}</dd></div>
                </dl>
              </div>
              {invitationLoadError ? <div className="workforceNotice" role="alert">{invitationLoadError} <button type="button" className="workforceButton secondary" onClick={() => refreshInvitations()}>Try again</button></div> : null}
              <div className="workforceTableViewport" role="region" aria-label="Workforce results" tabIndex={0} aria-busy={invitationLoading}>
                <table className="workforceTable">
                  <caption className="visuallyHidden">Workforce invitation status and selection</caption>
                  <thead><tr><th scope="col" className="selectionColumn"><span className="visuallyHidden">Select</span></th><th scope="col">Person</th><th scope="col">Business email</th><th scope="col">Organisational placement</th><th scope="col">Invitation status</th></tr></thead>
                  <tbody>
                    {workforceRows.map((person) => (
                      <tr key={person.id} className={selectedPeople.has(person.id) ? "workforceSelected" : ""}>
                        <td className="selectionColumn"><input type="checkbox" aria-label={`Select ${person.name || person.business_email || "workforce person"}`} disabled={!person.eligible} checked={selectedPeople.has(person.id)} onChange={() => setSelectedPeople((current) => { const next = new Set(current); next.has(person.id) ? next.delete(person.id) : next.add(person.id); return next; })} /></td>
                        <th scope="row" className="workforcePerson"><span className="workforceAvatar" aria-hidden="true">{String(person.name || person.business_email || "R").slice(0, 1).toUpperCase()}</span><strong>{person.name}</strong></th>
                        <td data-label="Business email" className="workforceEmail">{person.business_email || <span className="workforceMissing">No approved business email</span>}</td>
                        <td data-label="Organisational placement">{person.structural_placement}</td>
                        <td data-label="Invitation status"><span className={`workforceStatus ${person.root_status === "joined" ? "joined" : person.root_status === "sent" ? "sent" : "notInvited"}`}><span className="statusDot" aria-hidden="true" />{person.root_status === "not_invited" ? "Not invited" : person.root_status === "sent" ? "Invitation sent" : "Joined"}</span></td>
                      </tr>
                    ))}
                    {!workforceRows.length ? <tr><td colSpan={5} className="workforceEmpty">{invitationLoading ? "Loading workforce…" : workforceSearch ? "No people match this search. Try another name, email or placement." : "No workforce people to display."}</td></tr> : null}
                  </tbody>
                </table>
              </div>
              <nav className="workforcePagination" aria-label="Workforce pages">
                <span role="status">{invitationLoading ? "Loading workforce…" : `${workforceRows.length ? invitationPage.trail.length * 100 + 1 : 0}–${invitationPage.trail.length * 100 + workforceRows.length} of ${invitationPage.total.toLocaleString()} people`}</span>
                <div>
                  <button type="button" className="workforceButton secondary" disabled={invitationLoading || !invitationPage.trail.length} onClick={() => refreshInvitations(workforceSearch, invitationPage.trail.slice(0, -1), invitationPage.cutoff)}>← Previous</button>
                  <button type="button" className="workforceButton secondary" disabled={invitationLoading || !invitationPage.next || (invitationPage.trail.length + 1) * 100 >= invitationPage.total} onClick={() => refreshInvitations(workforceSearch, [...invitationPage.trail, invitationPage.next], invitationPage.cutoff)}>Next →</button>
                </div>
              </nav>
              <div className="workforceActionBar">
                <div className="workforceSelectionSummary"><strong>{selectedPeople.size.toLocaleString()} selected</strong><span>Select all applies to eligible people on this page.</span></div>
                <div className="workforceActions">
                  <button type="button" className="workforceButton secondary" onClick={() => setSelectedPeople(new Set(workforceRows.filter((person) => person.eligible).map((person) => person.id)))}>Select all not invited</button>
                  <button type="button" className="workforceButton primary" onClick={sendInvitations} disabled={sendingInvitations || selectedPeople.size === 0}>{sendingInvitations ? "Sending…" : `Send invitations (${selectedPeople.size})`}</button>
                </div>
              </div>
              {invitationMessage ? <p className="workforceMessage" role="status">{invitationMessage}</p> : null}
              <aside className="workforceManual" aria-label="Manual invitation option">
                <div><p className="sectionLabel">Invite manually</p><p>Share the employee join link and organisation code.</p></div>
                <div className="workforceCode"><span>Organisation code</span><strong>{organisation?.organisation_code || "Not available"}</strong></div>
                <button type="button" className="workforceButton secondary" onClick={copyJoinLink} disabled={!organisation?.organisation_code}>
                  {copied ? "Join link copied ✓" : "Copy employee join link"}
                </button>
              </aside>
            </section>
          ) : null}

          <section className="stats" aria-label="Organisation statistics">
            <div><strong>{departmentCount}</strong><span>Departments</span></div>
            <div><strong>{teamCount}</strong><span>Teams</span></div>
            <div><strong>{displayedPeople.length}</strong><span>People</span></div>
            <div><strong>{siteCount}</strong><span>Sites / locations</span></div>
            <div><strong>{activePeople.length ? assignedPeopleCount : assignedMemberCount}</strong><span>Placed in structure</span></div>
          </section>

          <div className="workspace">
            <section className="structureCard">
              <div className="sectionHeader">
                <div>
                  <p className="sectionLabel">Visual organisation map</p>
                  <h2>How {organisation?.name || "your organisation"} is organised</h2>
                </div>
                <button type="button" className="pillButton" onClick={() => openCreateUnit()}>＋ Add unit</button>
              </div>

              <div className="rootNode">
                <span>🏢</span>
                <div><strong>{organisation?.name}</strong><small>Whole organisation · {displayedPeople.length} people</small></div>
              </div>

              {rootUnits.length === 0 ? (
                <div className="emptyState">
                  <strong>Your organisation map is ready to begin.</strong>
                  <p>Add the first department, team, site or business unit. Nothing is created until you confirm it.</p>
                  <button type="button" onClick={() => openCreateUnit()}>Build the first unit</button>
                </div>
              ) : (
                <div className="tree">
                  {rootUnits.map((unit) => (
                    <StructureBranch key={unit.id} unit={unit} units={units} members={displayedPeople} onOpen={setSelectedUnit} />
                  ))}
                </div>
              )}
            </section>

            <aside className="peopleCard">
              <p className="sectionLabel">People</p>
              <h2>Current organisation</h2>
              <p className="muted">Department describes where someone belongs. Role controls what they are allowed to do.</p>
              <div className="peopleList">
                {displayedPeople.slice(0, 8).map((person) => {
                  const unit = units.find((item) => item.id === person.organisation_unit_id);
                  const linkedMember = person.organisation_member_id ? members.find((item) => item.id === person.organisation_member_id) : person;
                  return (
                    <div className="person" key={person.id}>
                      <span className="avatar">{String(person.name || person.business_email || person.email || "R").slice(0, 1).toUpperCase()}</span>
                      <div><strong>{person.name || person.business_email || person.email || "Workforce person"}</strong><small>{unit?.name || person.department || "Not placed in structure"}{person.job_title ? ` · ${person.job_title}` : ""}</small></div>
                      <em>{linkedMember?.role ? memberRoleLabel(linkedMember.role) : "Not invited"}</em>
                    </div>
                  );
                })}
              </div>
              {displayedPeople.length > 8 ? <p className="muted">And {displayedPeople.length - 8} more people in this organisation.</p> : null}
              <button type="button" className="wideButton" onClick={() => setShowPeoplePanel(true)}>Add people</button>
            </aside>
          </div>
        </section>
      </main>

      <RootModal
        isOpen={showUnitModal}
        onClose={() => !creatingUnit && setShowUnitModal(false)}
        title="Create Organisational Unit"
        eyebrow="Organisation Structure & People"
        primaryLabel={creatingUnit ? "Creating…" : "Create Unit"}
        onPrimary={createOrganisationUnit}
        primaryDisabled={creatingUnit || !newUnitName.trim()}
      >
        <label className="modalField"><span>Unit name</span><input value={newUnitName} onChange={(event) => setNewUnitName(event.target.value)} placeholder="e.g. Operations" autoFocus /></label>
        <div className="modalGrid">
          <label className="modalField"><span>Type</span><select value={newUnitType} onChange={(event) => setNewUnitType(event.target.value)}>{UNIT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="modalField"><span>Reports into</span><select value={newUnitParentId} onChange={(event) => setNewUnitParentId(event.target.value)}><option value="">{organisation?.name || "Whole organisation"}</option>{units.filter((unit) => unit.active !== false).map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unitTypeLabel(unit.unit_type)}</option>)}</select></label>
        </div>
        {unitError ? <div className="modalError">{unitError}</div> : null}
      </RootModal>

      <RootModal
        isOpen={Boolean(selectedUnit)}
        onClose={() => setSelectedUnit(null)}
        title={selectedUnit?.name || "Organisation Unit"}
        eyebrow="Organisation Structure & People"
        primaryLabel="＋ Add Unit Beneath This"
        onPrimary={() => openCreateUnit(selectedUnit?.id || "")}
        primaryDisabled={!selectedUnit?.id}
      >
        {selectedUnit ? (
          <div className="unitDetail">
            <div className="detailStats"><div><strong>{selectedMembers.length}</strong><span>People</span></div><div><strong>{units.filter((unit) => unit.parent_unit_id === selectedUnit.id).length}</strong><span>Units beneath</span></div><div><strong>{selectedUnit.active ? "Active" : "Inactive"}</strong><span>Status</span></div></div>
            <div><p className="sectionLabel">People in this unit</p>{selectedMembers.length ? selectedMembers.map((person) => { const linked = person.organisation_member_id ? members.find((member) => member.id === person.organisation_member_id) : person; return <div className="detailPerson" key={person.id}><strong>{person.name || person.business_email || person.email || "Workforce person"}</strong><span>{linked?.role ? memberRoleLabel(linked.role) : "Not invited"}</span></div>; }) : <p className="muted">No people are currently assigned directly to this unit.</p>}</div>
          </div>
        ) : null}
      </RootModal>

      <style jsx>{pageStyles}</style>
    </RootAtmosphere>
  );
}

const pageStyles = `
  .page,.loadingPage{min-height:100vh;padding:118px 24px 64px;box-sizing:border-box;color:#20251f}.loadingPage{display:grid;place-items:center}.shell{width:min(1380px,100%);margin:0 auto}.backLink{display:inline-flex;margin:0 0 14px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.62);color:#29483d;text-decoration:none;font-size:13px;font-weight:800;border:1px solid rgba(37,74,61,.1)}.hero{display:flex;justify-content:space-between;gap:30px;align-items:center;padding:34px 38px;border-radius:34px;background:linear-gradient(120deg,rgba(255,255,255,.84),rgba(241,238,228,.76));border:1px solid rgba(255,255,255,.82);box-shadow:0 22px 70px rgba(40,47,37,.10)}.kicker,.sectionLabel{margin:0 0 9px;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#68745e}.hero h1{margin:0;font:500 clamp(38px,6vw,66px)/1.02 Georgia,serif;letter-spacing:-.045em}.intro{max-width:760px;margin:17px 0 0;color:#596156;font-size:18px;line-height:1.65}.heroMark{min-width:180px;display:grid;justify-items:center;text-align:center;padding:18px;border-radius:24px;background:rgba(255,255,255,.54)}.heroMark span{font-weight:900}.heroMark small{color:#6c7469}.actionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}.actionCard{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;text-align:left;padding:20px;border:1px solid rgba(30,45,34,.08);border-radius:22px;background:rgba(255,255,255,.76);color:#253127;cursor:pointer;box-shadow:0 12px 34px rgba(40,47,37,.07)}.actionCard strong{font-size:16px}.actionCard small{grid-column:2;color:#697169}.actionIcon{grid-row:1/3;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#edf3eb;font-size:20px}.actionCard.primary{background:#254a3d;color:white}.actionCard.primary small{color:#dbe7df}.actionCard.coming{opacity:.66;cursor:not-allowed}.inviteCard{display:flex;justify-content:space-between;gap:24px;align-items:center;margin:18px 0;padding:26px 30px;border-radius:26px;background:rgba(255,255,255,.82);border:1px solid rgba(30,45,34,.08)}.inviteCard h2,.sectionHeader h2,.peopleCard h2{margin:0;font:500 28px/1.15 Georgia,serif}.inviteCard p{max-width:720px;color:#626b61}.inviteDetails{display:grid;gap:7px;min-width:240px}.inviteDetails span{font-size:12px;color:#6d756d}.inviteDetails strong{font-size:22px;letter-spacing:.08em}.inviteDetails button,.emptyState button,.wideButton,.pillButton{border:0;border-radius:999px;padding:13px 18px;background:#254a3d;color:white;font-weight:800;cursor:pointer}.inviteDetails button:disabled{opacity:.45}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:18px 0}.stats div{display:grid;gap:4px;padding:18px;border-radius:20px;background:rgba(255,255,255,.72);border:1px solid rgba(30,45,34,.07)}.stats strong{font-size:28px;color:#29483d}.stats span{font-size:12px;color:#697169}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.structureCard,.peopleCard{padding:28px;border-radius:30px;background:rgba(255,255,255,.78);border:1px solid rgba(30,45,34,.08);box-shadow:0 20px 60px rgba(40,47,37,.08)}.sectionHeader{display:flex;justify-content:space-between;gap:18px;align-items:center}.rootNode{width:min(440px,90%);margin:34px auto 12px;padding:18px 22px;border-radius:18px;background:linear-gradient(135deg,#315849,#203d34);color:white;display:flex;align-items:center;gap:14px;box-shadow:0 16px 34px rgba(33,67,54,.2)}.rootNode span{font-size:28px}.rootNode div{display:grid}.rootNode small{color:#d6e2da}.tree{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start;margin-top:28px}.branch{position:relative}.children{display:grid;gap:9px;margin:9px 0 0 calc(min(var(--depth),2) * 10px + 12px);padding-left:10px;border-left:1px solid rgba(40,74,58,.2)}.unitCard{width:100%;display:grid;grid-template-columns:auto 1fr;gap:4px 11px;text-align:left;padding:17px;border:1px solid rgba(37,74,61,.12);border-radius:18px;background:linear-gradient(145deg,#f9faf7,#edf3eb);color:#253127;cursor:pointer}.unitIcon{grid-row:1/3;width:34px;height:34px;border-radius:11px;background:white;display:grid;place-items:center;color:#2d6651}.unitCopy{display:grid}.unitCopy strong{font-size:15px}.unitCopy small,.unitCounts{font-size:11px;color:#697169}.unitCounts{grid-column:2}.emptyState{text-align:center;padding:46px 20px;border:1px dashed rgba(37,74,61,.24);border-radius:22px;margin-top:28px}.emptyState p{color:#687168}.peopleCard{align-self:start}.muted{color:#6c746c;line-height:1.55;font-size:13px}.peopleList{display:grid;gap:4px;margin:20px 0}.person{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(30,45,34,.07)}.avatar{grid-row:1/3;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#e5eee7;color:#315849;font-weight:900}.person div{display:grid;min-width:0}.person strong,.person small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.person small{color:#727a72}.person em{grid-column:2;font-style:normal;font-size:11px;color:#315849}.wideButton{width:100%;margin-top:10px}.errorCard,.modalError{padding:16px 18px;border-radius:16px;background:#fff0ed;color:#873c32;margin:16px 0}.modalField{display:grid;gap:8px;font-weight:800}.modalField input,.modalField select{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid rgba(24,24,24,.12);border-radius:14px;background:white;font:inherit}.modalGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.unitDetail{display:grid;gap:24px}.detailStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.detailStats div{display:grid;gap:4px;padding:16px;border-radius:15px;background:rgba(255,255,255,.58)}.detailStats span{font-size:12px;color:#707770}.detailPerson{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid rgba(24,24,24,.08)}.detailPerson span{color:#687168;font-size:13px}
  .inviteCard.workforcePanel{display:block;padding:0;overflow:hidden;box-shadow:0 18px 54px rgba(40,47,37,.07)}
  .workforceHeading{padding:28px 30px 0}.workforceHeading p:last-child{font-size:14px;line-height:1.65;margin:12px 0 0}
  .workforceToolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:24px 30px}
  .workforceSearch{display:grid;gap:8px;flex:1;max-width:470px;font-size:12px;font-weight:800;color:#465b4e}
  .workforceSearch input{box-sizing:border-box;width:100%;min-height:46px;padding:12px 15px;border:1px solid #ccd7ce;border-radius:14px;background:rgba(255,255,255,.9);color:#253127;font-family:inherit;font-size:14px;font-weight:400;line-height:1.4}
  .workforceSearch input::placeholder{color:#697169}.workforceCounts{display:flex;gap:0;margin:0;flex-shrink:0}.workforceCounts div{display:flex;flex-direction:column;gap:4px;padding:0 20px;border-left:1px solid #dce3d9}.workforceCounts div:first-child{border-left:0}.workforceCounts div:last-child{padding-right:0}.workforceCounts dt{font-size:11px;color:#59695d}.workforceCounts dd{order:-1;margin:0;font-size:26px;line-height:1.2;font-weight:600;color:#29483d;font-variant-numeric:tabular-nums}
  .workforceTableViewport{max-height:540px;overflow:auto;overscroll-behavior:contain;border-top:1px solid #dfe5dc;border-bottom:1px solid #dfe5dc;scrollbar-gutter:stable}
  .workforceTable{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;text-align:left;font-size:13px;line-height:1.5}
  .workforceTable thead th{position:sticky;top:0;z-index:1;background:#eef2eb;padding:14px 16px;font-size:11px;color:#4e6153;font-weight:800;border-bottom:1px solid #dce3d9}
  .workforceTable th:nth-child(2){width:21%}.workforceTable th:nth-child(3){width:25%}.workforceTable th:nth-child(5){width:150px}
  .workforceTable td,.workforceTable tbody th{padding:17px 16px;border-bottom:1px solid #e5e9e1;vertical-align:middle;overflow-wrap:anywhere;color:#536151}
  .workforceTable tbody tr:last-child td,.workforceTable tbody tr:last-child th{border-bottom:0}.workforceTable .selectionColumn{width:44px;padding-left:20px;padding-right:0;box-sizing:border-box}
  .selectionColumn input{width:18px;height:18px;margin:0;accent-color:#254a3d;cursor:pointer;vertical-align:middle}.selectionColumn input:disabled{cursor:not-allowed;opacity:.5}
  .workforceTable tbody tr:hover{background:#f5f7f1}.workforceTable tbody tr.workforceSelected{background:#eaf1e8}.workforceTable tbody tr:focus-within{box-shadow:inset 3px 0 #315849}
  .workforceTable .workforcePerson{color:#253b2e;font-weight:600}.workforcePerson strong{font-size:14px;font-weight:700}.workforceAvatar{display:inline-grid;place-items:center;vertical-align:middle;width:30px;height:30px;margin-right:9px;border-radius:50%;background:#e5ece1;color:#385641;font-size:12px;font-weight:800}.workforceMissing{color:#756d5d;font-style:italic}
  .workforceStatus{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid transparent}.workforceStatus.notInvited{background:#f3eee4;color:#6a5935;border-color:#e8dfcd}.workforceStatus.sent{background:#eaf1f4;color:#3a6070;border-color:#d5e3e8}.workforceStatus.joined{background:#e5efe5;color:#305b3e;border-color:#cedfce}.statusDot{width:5px;height:5px;flex-shrink:0;border-radius:50%;background:currentColor}
  .workforceTable .workforceEmpty{text-align:center;padding:44px 24px;color:#687168}
  .workforcePagination{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 30px;color:#667160;font-size:12px;font-variant-numeric:tabular-nums}.workforcePagination>div{display:flex;gap:8px}
  .workforceButton{min-height:44px;padding:11px 17px;border:1px solid transparent;border-radius:999px;font-family:inherit;font-size:12px;font-weight:800;line-height:1.4;cursor:pointer;transition:background .15s,border-color .15s}.workforceButton.secondary{background:rgba(255,255,255,.85);color:#29483d;border-color:#cbd8cc}.workforceButton.primary{background:#254a3d;color:#fff;box-shadow:0 5px 12px rgba(37,74,61,.12)}.workforceButton.secondary:hover:not(:disabled){background:#eef3eb;border-color:#95ae9b}.workforceButton.primary:hover:not(:disabled){background:#183e30}.workforceButton:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
  .workforcePanel button:focus-visible,.workforcePanel input:focus-visible,.workforceTableViewport:focus-visible{outline:2px solid #386c52;outline-offset:3px}
  .workforceActionBar{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 30px;background:#edf3e9;border-top:1px solid #dae3d5}.workforceSelectionSummary{display:grid;gap:5px}.workforceSelectionSummary strong{font-size:14px;color:#29483d}.workforceSelectionSummary span{font-size:12px;color:#63705d}.workforceActions{display:flex;gap:10px;flex-wrap:wrap}
  .workforceManual{display:flex;align-items:center;gap:24px;padding:22px 30px;border-top:1px solid #dfe5dc;background:rgba(249,248,243,.6)}.workforceManual>div:first-child{flex:1}.workforceManual p{margin:0;font-size:12px;line-height:1.5}.workforceManual .sectionLabel{font-size:10px;margin-bottom:5px}.workforceCode{display:grid;gap:4px}.workforceCode span{font-size:10px;color:#697169}.workforceCode strong{font-size:17px;letter-spacing:.08em;color:#40543f}.workforceNotice{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 30px 20px;padding:14px;border-radius:14px;background:#fff0ed;color:#873c32;font-size:13px}.inviteCard .workforceMessage{margin:0;max-width:none;padding:14px 30px;background:#edf3e9;color:#29483d;font-size:13px}
  .visuallyHidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  @media(max-width:1000px){.workforceToolbar{align-items:stretch;flex-direction:column;gap:18px}.workforceSearch{max-width:none}.workforceCounts div{flex:1}.workforceCounts div:first-child{padding-left:0}.workforceActionBar{align-items:flex-start;flex-direction:column}.workforceActions{width:100%}.workforceManual{flex-wrap:wrap}.workforceTable th:nth-child(5){width:130px}.workforceTable td,.workforceTable tbody th,.workforceTable thead th{padding-left:10px;padding-right:10px}}
  @media(max-width:640px){
    .workforceHeading{padding:22px 20px 0}.workforceToolbar{padding:20px}.workforceCounts div{padding:0 12px}.workforceCounts dd{font-size:23px}
    .workforceTableViewport{max-height:520px;background:#f5f6f0}.workforceTable,.workforceTable tbody{display:block}.workforceTable thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
    .workforceTable tbody tr{display:grid;grid-template-columns:34px minmax(0,1fr);margin:12px;border:1px solid #dce3d9;border-radius:16px;background:#fff;padding:14px;gap:8px 4px}.workforceTable tbody th,.workforceTable td{display:block;border:0;padding:0}.workforceTable .selectionColumn{grid-column:1;grid-row:1;padding:4px 0;width:auto}.workforceTable th.workforcePerson{width:auto;grid-column:2;grid-row:1}.workforceTable td[data-label]{grid-column:2}.workforceTable td[data-label]::before{content:attr(data-label);display:block;margin-bottom:2px;color:#687168;font-size:10px;font-weight:700}.workforceTable .workforceEmpty{grid-column:1/-1;padding:20px 8px}.workforcePerson strong{font-size:15px}.workforceAvatar{display:none}
    .workforcePagination{padding:14px 20px;flex-wrap:wrap}.workforcePagination>div{margin-left:auto}.workforcePagination .workforceButton{padding:8px 13px}.workforceActionBar{padding:20px}.workforceActions{display:grid;grid-template-columns:1fr;gap:10px}.workforceButton{min-height:46px}.workforceManual{padding:20px;gap:16px}.workforceManual>div:first-child{flex-basis:100%}.workforceManual>.workforceButton{width:100%}.workforceNotice{margin:0 20px 16px;flex-wrap:wrap}
  }
  @media(max-width:1000px){.workspace{grid-template-columns:1fr}.peopleCard{order:-1}.stats{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:720px){.page,.loadingPage{padding:100px 14px 40px}.hero{padding:27px 22px;align-items:flex-start}.heroMark{display:none}.actionGrid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.structureCard,.peopleCard{padding:20px}.sectionHeader,.inviteCard{align-items:flex-start;flex-direction:column}.tree{grid-template-columns:1fr}.modalGrid{grid-template-columns:1fr}.detailStats{grid-template-columns:1fr}}
`;
