"use client";

import { useEffect, useMemo, useState } from "react";

import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import RootModal from "../../components/workplace/RootModal";
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
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState("department");
  const [newUnitParentId, setNewUnitParentId] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitError, setUnitError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
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

    const [organisationResult, unitResult, memberResult] = await Promise.all([
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
    ]);

    const loadError = organisationResult.error || unitResult.error || memberResult.error;
    if (loadError || !organisationResult.data) {
      setError(loadError?.message || "Root could not load this organisation structure.");
      setLoading(false);
      return;
    }

    setOrganisation(organisationResult.data);
    setUnits(Array.isArray(unitResult.data) ? unitResult.data : []);
    setMembers(Array.isArray(memberResult.data) ? memberResult.data : []);
    setLoading(false);
  }

  const rootUnits = useMemo(
    () => units.filter((unit) => !unit.parent_unit_id),
    [units]
  );

  const assignedMemberCount = members.filter((member) => member.organisation_unit_id).length;
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
    ? members.filter((member) => member.organisation_unit_id === selectedUnit.id)
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
            <button type="button" className="actionCard coming" disabled>
              <span className="actionIcon">▦</span>
              <strong>Upload staff spreadsheet</strong>
              <small>Coming next</small>
            </button>
            <button type="button" className="actionCard primary" onClick={() => openCreateUnit()}>
              <span className="actionIcon">⌘</span>
              <strong>Build structure</strong>
              <small>Add a department, team, site or business unit</small>
            </button>
          </section>

          {showPeoplePanel ? (
            <section className="inviteCard">
              <div>
                <p className="sectionLabel">Add people</p>
                <h2>Invite your people to Root</h2>
                <p>Share this private joining route and organisation code. Each person keeps their own private Root identity and history.</p>
              </div>
              <div className="inviteDetails">
                <span>Organisation code</span>
                <strong>{organisation?.organisation_code || "Not available"}</strong>
                <button type="button" onClick={copyJoinLink} disabled={!organisation?.organisation_code}>
                  {copied ? "Join link copied ✓" : "Copy employee join link"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="stats" aria-label="Organisation statistics">
            <div><strong>{departmentCount}</strong><span>Departments</span></div>
            <div><strong>{teamCount}</strong><span>Teams</span></div>
            <div><strong>{members.length}</strong><span>People</span></div>
            <div><strong>{siteCount}</strong><span>Sites / locations</span></div>
            <div><strong>{assignedMemberCount}</strong><span>Placed in structure</span></div>
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
                <div><strong>{organisation?.name}</strong><small>Whole organisation · {members.length} people</small></div>
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
                    <StructureBranch key={unit.id} unit={unit} units={units} members={members} onOpen={setSelectedUnit} />
                  ))}
                </div>
              )}
            </section>

            <aside className="peopleCard">
              <p className="sectionLabel">People</p>
              <h2>Current organisation</h2>
              <p className="muted">Department describes where someone belongs. Role controls what they are allowed to do.</p>
              <div className="peopleList">
                {members.slice(0, 8).map((person) => {
                  const unit = units.find((item) => item.id === person.organisation_unit_id);
                  return (
                    <div className="person" key={person.id}>
                      <span className="avatar">{String(person.name || person.email || "R").slice(0, 1).toUpperCase()}</span>
                      <div><strong>{person.name || person.email || "Root member"}</strong><small>{unit?.name || person.department || "Not placed in structure"}</small></div>
                      <em>{memberRoleLabel(person.role)}</em>
                    </div>
                  );
                })}
              </div>
              {members.length > 8 ? <p className="muted">And {members.length - 8} more people in this organisation.</p> : null}
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
            <div><p className="sectionLabel">People in this unit</p>{selectedMembers.length ? selectedMembers.map((person) => <div className="detailPerson" key={person.id}><strong>{person.name || person.email || "Root member"}</strong><span>{memberRoleLabel(person.role)}</span></div>) : <p className="muted">No people are currently assigned directly to this unit.</p>}</div>
          </div>
        ) : null}
      </RootModal>

      <style jsx>{pageStyles}</style>
    </RootAtmosphere>
  );
}

const pageStyles = `
  .page,.loadingPage{min-height:100vh;padding:118px 24px 64px;box-sizing:border-box;color:#20251f}.loadingPage{display:grid;place-items:center}.shell{width:min(1380px,100%);margin:0 auto}.backLink{display:inline-flex;margin:0 0 14px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.62);color:#29483d;text-decoration:none;font-size:13px;font-weight:800;border:1px solid rgba(37,74,61,.1)}.hero{display:flex;justify-content:space-between;gap:30px;align-items:center;padding:34px 38px;border-radius:34px;background:linear-gradient(120deg,rgba(255,255,255,.84),rgba(241,238,228,.76));border:1px solid rgba(255,255,255,.82);box-shadow:0 22px 70px rgba(40,47,37,.10)}.kicker,.sectionLabel{margin:0 0 9px;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#68745e}.hero h1{margin:0;font:500 clamp(38px,6vw,66px)/1.02 Georgia,serif;letter-spacing:-.045em}.intro{max-width:760px;margin:17px 0 0;color:#596156;font-size:18px;line-height:1.65}.heroMark{min-width:180px;display:grid;justify-items:center;text-align:center;padding:18px;border-radius:24px;background:rgba(255,255,255,.54)}.heroMark span{font-weight:900}.heroMark small{color:#6c7469}.actionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}.actionCard{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;text-align:left;padding:20px;border:1px solid rgba(30,45,34,.08);border-radius:22px;background:rgba(255,255,255,.76);color:#253127;cursor:pointer;box-shadow:0 12px 34px rgba(40,47,37,.07)}.actionCard strong{font-size:16px}.actionCard small{grid-column:2;color:#697169}.actionIcon{grid-row:1/3;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#edf3eb;font-size:20px}.actionCard.primary{background:#254a3d;color:white}.actionCard.primary small{color:#dbe7df}.actionCard.coming{opacity:.66;cursor:not-allowed}.inviteCard{display:flex;justify-content:space-between;gap:24px;align-items:center;margin:18px 0;padding:26px 30px;border-radius:26px;background:rgba(255,255,255,.82);border:1px solid rgba(30,45,34,.08)}.inviteCard h2,.sectionHeader h2,.peopleCard h2{margin:0;font:500 28px/1.15 Georgia,serif}.inviteCard p{max-width:720px;color:#626b61}.inviteDetails{display:grid;gap:7px;min-width:240px}.inviteDetails span{font-size:12px;color:#6d756d}.inviteDetails strong{font-size:22px;letter-spacing:.08em}.inviteDetails button,.emptyState button,.wideButton,.pillButton{border:0;border-radius:999px;padding:13px 18px;background:#254a3d;color:white;font-weight:800;cursor:pointer}.inviteDetails button:disabled{opacity:.45}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:18px 0}.stats div{display:grid;gap:4px;padding:18px;border-radius:20px;background:rgba(255,255,255,.72);border:1px solid rgba(30,45,34,.07)}.stats strong{font-size:28px;color:#29483d}.stats span{font-size:12px;color:#697169}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px}.structureCard,.peopleCard{padding:28px;border-radius:30px;background:rgba(255,255,255,.78);border:1px solid rgba(30,45,34,.08);box-shadow:0 20px 60px rgba(40,47,37,.08)}.sectionHeader{display:flex;justify-content:space-between;gap:18px;align-items:center}.rootNode{width:min(440px,90%);margin:34px auto 12px;padding:18px 22px;border-radius:18px;background:linear-gradient(135deg,#315849,#203d34);color:white;display:flex;align-items:center;gap:14px;box-shadow:0 16px 34px rgba(33,67,54,.2)}.rootNode span{font-size:28px}.rootNode div{display:grid}.rootNode small{color:#d6e2da}.tree{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start;margin-top:28px}.branch{position:relative}.children{display:grid;gap:9px;margin:9px 0 0 calc(min(var(--depth),2) * 10px + 12px);padding-left:10px;border-left:1px solid rgba(40,74,58,.2)}.unitCard{width:100%;display:grid;grid-template-columns:auto 1fr;gap:4px 11px;text-align:left;padding:17px;border:1px solid rgba(37,74,61,.12);border-radius:18px;background:linear-gradient(145deg,#f9faf7,#edf3eb);color:#253127;cursor:pointer}.unitIcon{grid-row:1/3;width:34px;height:34px;border-radius:11px;background:white;display:grid;place-items:center;color:#2d6651}.unitCopy{display:grid}.unitCopy strong{font-size:15px}.unitCopy small,.unitCounts{font-size:11px;color:#697169}.unitCounts{grid-column:2}.emptyState{text-align:center;padding:46px 20px;border:1px dashed rgba(37,74,61,.24);border-radius:22px;margin-top:28px}.emptyState p{color:#687168}.peopleCard{align-self:start}.muted{color:#6c746c;line-height:1.55;font-size:13px}.peopleList{display:grid;gap:4px;margin:20px 0}.person{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(30,45,34,.07)}.avatar{grid-row:1/3;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#e5eee7;color:#315849;font-weight:900}.person div{display:grid;min-width:0}.person strong,.person small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.person small{color:#727a72}.person em{grid-column:2;font-style:normal;font-size:11px;color:#315849}.wideButton{width:100%;margin-top:10px}.errorCard,.modalError{padding:16px 18px;border-radius:16px;background:#fff0ed;color:#873c32;margin:16px 0}.modalField{display:grid;gap:8px;font-weight:800}.modalField input,.modalField select{width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid rgba(24,24,24,.12);border-radius:14px;background:white;font:inherit}.modalGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.unitDetail{display:grid;gap:24px}.detailStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.detailStats div{display:grid;gap:4px;padding:16px;border-radius:15px;background:rgba(255,255,255,.58)}.detailStats span{font-size:12px;color:#707770}.detailPerson{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid rgba(24,24,24,.08)}.detailPerson span{color:#687168;font-size:13px}
  @media(max-width:1000px){.workspace{grid-template-columns:1fr}.peopleCard{order:-1}.stats{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:720px){.page,.loadingPage{padding:100px 14px 40px}.hero{padding:27px 22px;align-items:flex-start}.heroMark{display:none}.actionGrid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.structureCard,.peopleCard{padding:20px}.sectionHeader,.inviteCard{align-items:flex-start;flex-direction:column}.tree{grid-template-columns:1fr}.modalGrid{grid-template-columns:1fr}.detailStats{grid-template-columns:1fr}}
`;
