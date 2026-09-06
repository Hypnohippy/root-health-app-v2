"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  WORKFORCE_FIELDS,
  buildSourceColumns,
  buildWorkforcePreview,
  proposeWorkforceMappings,
} from "../../lib/workforceImportPreview";
import { deriveHierarchyFields } from "../../lib/workforceImportApply";
import { supabase } from "../../lib/supabase";

const MAX_PREVIEW_ROWS = 5000;
const HIERARCHY_LABELS = { division: "Division / business unit", department: "Department", team: "Team", location: "Site / location" };

function confidenceLabel(mapping) {
  if (mapping.reviewed) return "Reviewed";
  if (mapping.confidence === "high") return "Clear match";
  if (mapping.confidence === "medium") return "Likely match";
  return "Needs review";
}

function Stat({ value, label }) {
  return <div className="importStat"><strong>{Number(value || 0).toLocaleString("en-GB")}</strong><span>{label}</span></div>;
}

function HierarchyNode({ node }) {
  return (
    <div className="hierarchyNode">
      <strong>{node.name}</strong><small>{HIERARCHY_LABELS[node.type === "site" ? "location" : node.type] || node.type}</small>
      {node.children?.length ? <div className="hierarchyChildren">{node.children.map((child) => <HierarchyNode node={child} key={`${child.type}-${child.name}`} />)}</div> : null}
    </div>
  );
}

export default function WorkforceImportPreview({ organisationId, existingMembers = [], onApplied, onClose }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [mappings, setMappings] = useState({});
  const [hierarchyFields, setHierarchyFields] = useState([]);
  const [excludedHierarchyFields, setExcludedHierarchyFields] = useState([]);
  const [serverPlan, setServerPlan] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);

  const mappedHierarchyFields = useMemo(() => deriveHierarchyFields(columns, mappings), [columns, mappings]);
  const preview = useMemo(
    () => buildWorkforcePreview({ rows, columns, mappings, existingMembers, hierarchyFields }),
    [rows, columns, mappings, existingMembers, hierarchyFields]
  );

  useEffect(() => {
    setExcludedHierarchyFields((current) => {
      const next = current.filter((field) => mappedHierarchyFields.includes(field));
      return next.length === current.length && next.every((field, index) => field === current[index]) ? current : next;
    });
    setHierarchyFields((current) => {
      const retained = current.filter((field) => mappedHierarchyFields.includes(field));
      const additions = mappedHierarchyFields.filter((field) => !retained.includes(field) && !excludedHierarchyFields.includes(field));
      const next = [...retained, ...additions];
      return next.length === current.length && next.every((field, index) => field === current[index]) ? current : next;
    });
  }, [mappedHierarchyFields, excludedHierarchyFields]);

  async function analyseFile(file) {
    setError("");
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
      setError("Please choose an .xlsx or .csv workforce file.");
      return;
    }

    setLoading(true);
    try {
      const module = await import("xlsx");
      const XLSX = module.default || module;
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) throw new Error("This file does not contain a worksheet.");

      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });
      const headingIndex = matrix.findIndex((row) => Array.isArray(row) && row.some((value) => String(value).trim()));
      if (headingIndex < 0) throw new Error("Root could not find a heading row in this file.");

      const headings = matrix[headingIndex].map((value, index) => String(value || `Column ${index + 1}`).trim());
      const dataRows = matrix
        .slice(headingIndex + 1)
        .filter((row) => Array.isArray(row) && row.some((value) => String(value ?? "").trim()));
      if (!dataRows.length) throw new Error("Root found headings, but no workforce rows beneath them.");
      if (dataRows.length > MAX_PREVIEW_ROWS) {
        throw new Error(`This first preview supports up to ${MAX_PREVIEW_ROWS.toLocaleString("en-GB")} rows at a time.`);
      }

      const nextColumns = buildSourceColumns(headings, dataRows.slice(0, 25));
      setFileName(file.name);
      setSheetName(firstSheetName);
      setColumns(nextColumns);
      setRows(dataRows);
      setMappings(proposeWorkforceMappings(nextColumns));
      setHierarchyFields([]);
      setExcludedHierarchyFields([]);
    } catch (fileError) {
      setFileName("");
      setSheetName("");
      setColumns([]);
      setRows([]);
      setMappings({});
      setHierarchyFields([]);
      setExcludedHierarchyFields([]);
      setError(fileError?.message || "Root could not analyse this workforce file.");
    } finally {
      setLoading(false);
    }
  }

  function updateMapping(columnKey, field) {
    setServerPlan(null);
    setConfirmed(false);
    setMappings((current) => ({
      ...current,
      [columnKey]: {
        ...(current[columnKey] || {}),
        field,
        reviewed: true,
        confidence: "high",
      },
    }));
  }

  function setReviewedHierarchy(nextFields) {
    setServerPlan(null);
    setConfirmed(false);
    setHierarchyFields(nextFields);
  }

  function moveHierarchyField(field, direction) {
    const index = hierarchyFields.indexOf(field);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= hierarchyFields.length) return;
    const next = [...hierarchyFields];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setReviewedHierarchy(next);
  }

  function excludeHierarchyField(field) {
    setExcludedHierarchyFields((current) => [...new Set([...current, field])]);
    setReviewedHierarchy(hierarchyFields.filter((item) => item !== field));
  }

  function includeHierarchyField(field) {
    setExcludedHierarchyFields((current) => current.filter((item) => item !== field));
    setReviewedHierarchy([...hierarchyFields, field]);
  }

  function dropHierarchyField(event, targetField) {
    event.preventDefault();
    const sourceField = event.dataTransfer.getData("text/plain");
    if (!hierarchyFields.includes(sourceField) || sourceField === targetField) return;
    const next = hierarchyFields.filter((field) => field !== sourceField);
    next.splice(next.indexOf(targetField), 0, sourceField);
    setReviewedHierarchy(next);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    analyseFile(event.dataTransfer.files?.[0]);
  }

  const hasFile = columns.length > 0;

  async function submitConfirmation(action) {
    setError("");
    setConfirming(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Root could not verify your signed-in account.");
      const response = await fetch("/api/organisation/workforce-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          confirmed: action === "apply" && confirmed,
          organisation_id: organisationId,
          canonical_rows: preview.canonicalRows,
          mapped_hierarchy_fields: mappedHierarchyFields,
          hierarchy_fields: hierarchyFields,
          expected_plan_fingerprint: action === "apply" ? serverPlan?.plan_fingerprint : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Root could not confirm this structure.");
      if (action === "plan") setServerPlan(payload);
      else {
        setResult(payload.result);
        await onApplied?.();
      }
    } catch (submitError) {
      setError(submitError?.message || "Root could not confirm this structure.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="importer" aria-label="Adaptive workforce import preview">
      <div className="importHeader">
        <div>
          <p className="importKicker">Adaptive workforce import</p>
          <h2>Upload → map → review → preview</h2>
          <p>Use your existing workforce export. Root will adapt its headings into a reviewable organisation preview.</p>
        </div>
        <button type="button" className="closeButton" onClick={onClose}>Close</button>
      </div>

      <div
        className={`dropZone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(event) => analyseFile(event.target.files?.[0])}
        />
        <span className="fileIcon">▦</span>
        <strong>{loading ? "Root is reading the file…" : "Drop your workforce spreadsheet here"}</strong>
        <small>.xlsx or .csv · analysed locally · nothing changes live</small>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}>Choose file</button>
      </div>

      {error ? <div className="importError">{error}</div> : null}

      {hasFile ? (
        <>
          <div className="fileSummary">
            <div><strong>{fileName}</strong><span>Sheet: {sheetName} · {rows.length.toLocaleString("en-GB")} rows</span></div>
            <span className="safeBadge">Preview only — no live changes</span>
          </div>

          <section className="mappingSection">
            <div className="sectionHeading">
              <div><p className="importKicker">1. Review mapping</p><h3>What Root thinks each column means</h3></div>
              <p>Every mapping is editable. Choose Ignore for columns Root should not use.</p>
            </div>
            <div className="mappingList">
              {columns.map((column) => {
                const mapping = mappings[column.key] || { field: "ignore", confidence: "review" };
                return (
                  <div className="mappingRow" key={column.key}>
                    <div><strong>{column.heading}</strong><small>{column.samples.slice(0, 2).join(" · ") || "No representative values"}</small></div>
                    <span aria-hidden="true">→</span>
                    <label>
                      <span className="srOnly">Map {column.heading}</span>
                      <select value={mapping.field} onChange={(event) => updateMapping(column.key, event.target.value)}>
                        {WORKFORCE_FIELDS.map((field) => <option value={field.value} key={field.value}>{field.label}</option>)}
                      </select>
                    </label>
                    <em className={mapping.confidence === "review" && !mapping.reviewed ? "review" : "clear"}>{confidenceLabel(mapping)}</em>
                  </div>
                );
              })}
            </div>
            <div className="hierarchyOrder" aria-label="Organisation hierarchy">
              <div className="hierarchyOrderHeading">
                <div><strong>Organisation hierarchy</strong><p>Arrange how Root should build your organisation map. This does not alter your spreadsheet.</p></div>
                <small>Top level → most specific</small>
              </div>
              <div className="hierarchyOrderList">
                {hierarchyFields.map((field, index) => (
                  <div
                    className="hierarchyOrderItem"
                    draggable
                    key={field}
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", field)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropHierarchyField(event, field)}
                  >
                    <span aria-hidden="true">⠿</span><strong>{HIERARCHY_LABELS[field]}</strong>
                    <div className="hierarchyActions">
                      <button type="button" disabled={index === 0} onClick={() => moveHierarchyField(field, -1)} aria-label={`Move ${HIERARCHY_LABELS[field]} up`}>↑</button>
                      <button type="button" disabled={index === hierarchyFields.length - 1} onClick={() => moveHierarchyField(field, 1)} aria-label={`Move ${HIERARCHY_LABELS[field]} down`}>↓</button>
                      <button type="button" onClick={() => excludeHierarchyField(field)}>Exclude</button>
                    </div>
                  </div>
                ))}
              </div>
              {excludedHierarchyFields.length ? <div className="excludedHierarchy"><span>Available but excluded:</span>{excludedHierarchyFields.map((field) => <button type="button" key={field} onClick={() => includeHierarchyField(field)}>＋ {HIERARCHY_LABELS[field]}</button>)}</div> : null}
              {!hierarchyFields.length ? <p className="hierarchyWarning">Include at least one mapped structural field to build the organisation map.</p> : null}
            </div>
            <p className="permissionNote"><strong>Permissions are not imported.</strong> Job titles, departments and words such as HR, Director, Manager or Administrator never grant Root administrative access.</p>
          </section>

          <section className="previewSection">
            <div className="sectionHeading"><div><p className="importKicker">2. Organisation preview</p><h3>What this file would propose</h3></div><p>This is an in-browser model only. No units, memberships, invitations or roles have been changed.</p></div>
            <div className="importStats">
              <Stat value={preview.summary.people} label="People found" />
              <Stat value={preview.summary.departments} label="Departments" />
              <Stat value={preview.summary.teams} label="Teams" />
              <Stat value={preview.summary.locations} label="Locations" />
              <Stat value={preview.summary.managers} label="Managers referenced" />
              <Stat value={preview.summary.attentionRows} label="Rows need attention" />
            </div>

            <div className="previewGrid">
              <div className="hierarchyPreview">
                <h4>Proposed structure</h4>
                <div className="hierarchyRoot"><strong>Whole organisation</strong>{preview.hierarchy.slice(0, 20).map((node) => <HierarchyNode node={node} key={`${node.type}-${node.name}`} />)}</div>
              </div>

              <aside className="attentionPanel">
                <h4>Needs attention</h4>
                <p>{preview.validation.issues.length ? `${preview.validation.issues.length} checks need review before a later import can proceed.` : "Root found no issues in this preview."}</p>
                <div className="issueList">
                  {preview.validation.issues.slice(0, 30).map((item, index) => <div key={`${item.type}-${item.row || item.field}-${index}`}>{item.message}</div>)}
                  {preview.validation.issues.length > 30 ? <div>And {preview.validation.issues.length - 30} more checks.</div> : null}
                </div>
              </aside>
            </div>

            <details className="peoplePreview">
              <summary>View representative people rows</summary>
              <div className="tableScroll"><table><thead><tr><th>Name</th><th>Email</th><th>Division</th><th>Department</th><th>Team</th><th>Location</th><th>Manager</th></tr></thead><tbody>{preview.canonicalRows.slice(0, 12).map((row) => <tr key={row.source_row}><td>{row.name || "—"}</td><td>{row.email || "—"}</td><td>{row.division || "—"}</td><td>{row.department || "—"}</td><td>{row.team || "—"}</td><td>{row.location || "—"}</td><td>{row.manager || "—"}</td></tr>)}</tbody></table></div>
            </details>

            {result ? (
              <div className="confirmationBox"><strong>Organisation structure confirmed.</strong><span>{result.createdUnits} units created · {result.createdPeople} people added · {result.updatedPeople} people updated · {result.excludedRows} excluded.</span></div>
            ) : serverPlan ? (
              <div className="confirmationBox">
                <strong>Confirm exactly what Root will apply</strong>
                <span>{serverPlan.summary.units} units will be created or reused · {serverPlan.summary.people} people will be created · {serverPlan.summary.existingPeople} existing people will be updated · {serverPlan.summary.excluded} records require resolution and will not be applied.</span>
                <label className="confirmCheck"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm this reviewed structure for my organisation.</label>
                <button type="button" className="confirmButton" disabled={!confirmed || confirming} onClick={() => submitConfirmation("apply")}>{confirming ? "Confirming…" : "Confirm organisation structure"}</button>
              </div>
            ) : (
              <button type="button" className="confirmButton" disabled={confirming || preview.validation.mappingIssues > 0 || !hierarchyFields.length} onClick={() => submitConfirmation("plan")}>{confirming ? "Checking live organisation…" : "Review final organisation changes"}</button>
            )}
          </section>
        </>
      ) : null}

      <style jsx>{`
        .hierarchyOrder{margin:18px 0;padding:18px;border-radius:18px;background:#edf3eb}.hierarchyOrderHeading{display:flex;justify-content:space-between;gap:18px}.hierarchyOrderHeading p{margin:4px 0;color:#657066}.hierarchyOrderHeading small{white-space:nowrap;color:#687168}.hierarchyOrderList{display:grid;gap:8px;margin-top:14px}.hierarchyOrderItem{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;background:white;cursor:grab}.hierarchyOrderItem>strong{flex:1}.hierarchyActions{display:flex;gap:5px}.hierarchyActions button,.excludedHierarchy button{border:1px solid rgba(37,74,61,.14);border-radius:999px;padding:7px 10px;background:#f8faf7;color:#29483d;font-weight:800;cursor:pointer}.hierarchyActions button:disabled{opacity:.35;cursor:not-allowed}.excludedHierarchy{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:12px;color:#657066}.hierarchyWarning{color:#813b32}.hierarchyRoot{display:grid;gap:8px;padding-left:12px;border-left:3px solid #315849}.hierarchyNode{display:grid;gap:2px;padding:9px 10px;border-radius:11px;background:white}.hierarchyNode small{color:#737b73}.hierarchyChildren{display:grid;gap:6px;margin-top:6px;padding-left:12px;border-left:1px solid rgba(37,74,61,.2)}
        @media(max-width:1100px){.importStats{grid-template-columns:repeat(3,1fr)}.previewGrid{grid-template-columns:1fr}.mappingRow{grid-template-columns:minmax(150px,1fr) auto minmax(160px,1fr)}.mappingRow em{grid-column:3}}
        @media(max-width:700px){.importer{padding:19px}.importHeader,.sectionHeading,.fileSummary,.hierarchyOrderHeading{flex-direction:column}.mappingRow{grid-template-columns:1fr}.mappingRow>span{display:none}.mappingRow em{grid-column:auto}.importStats{grid-template-columns:repeat(2,1fr)}.safeBadge{align-self:flex-start}.hierarchyOrderItem{align-items:flex-start;flex-wrap:wrap}.hierarchyActions{width:100%;justify-content:flex-end}}
      `}</style>
    </section>
  );
}
