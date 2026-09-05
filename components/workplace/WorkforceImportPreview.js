"use client";

import { useMemo, useRef, useState } from "react";

import {
  WORKFORCE_FIELDS,
  buildSourceColumns,
  buildWorkforcePreview,
  proposeWorkforceMappings,
} from "../../lib/workforceImportPreview";

const MAX_PREVIEW_ROWS = 5000;

function confidenceLabel(mapping) {
  if (mapping.reviewed) return "Reviewed";
  if (mapping.confidence === "high") return "Clear match";
  if (mapping.confidence === "medium") return "Likely match";
  return "Needs review";
}

function Stat({ value, label }) {
  return <div className="importStat"><strong>{Number(value || 0).toLocaleString("en-GB")}</strong><span>{label}</span></div>;
}

export default function WorkforceImportPreview({ existingMembers = [], onClose }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [mappings, setMappings] = useState({});

  const preview = useMemo(
    () => buildWorkforcePreview({ rows, columns, mappings, existingMembers }),
    [rows, columns, mappings, existingMembers]
  );

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
    } catch (fileError) {
      setFileName("");
      setSheetName("");
      setColumns([]);
      setRows([]);
      setMappings({});
      setError(fileError?.message || "Root could not analyse this workforce file.");
    } finally {
      setLoading(false);
    }
  }

  function updateMapping(columnKey, field) {
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

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    analyseFile(event.dataTransfer.files?.[0]);
  }

  const hasFile = columns.length > 0;

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
                {preview.hierarchy.slice(0, 12).map((division) => (
                  <div className="divisionNode" key={division.name}>
                    <strong>{division.name}</strong>
                    <div className="departmentNodes">
                      {division.departments.slice(0, 12).map((department) => (
                        <div className="departmentNode" key={department.name}>
                          <span>{department.name}</span>
                          {department.teams.length ? <small>{department.teams.map((team) => team.name).join(" · ")}</small> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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

            <button type="button" className="futureButton" disabled>Confirm structure &amp; prepare invitations · Coming next</button>
          </section>
        </>
      ) : null}

      <style jsx>{`
        .importer{margin:18px 0;padding:28px;border-radius:30px;background:rgba(255,255,255,.82);border:1px solid rgba(30,45,34,.08);box-shadow:0 20px 60px rgba(40,47,37,.08);color:#243027}.importHeader,.sectionHeading,.fileSummary{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.importHeader h2,.sectionHeading h3{margin:0;font:500 30px/1.15 Georgia,serif}.importHeader p,.sectionHeading p{max-width:680px;color:#657066;line-height:1.55}.importKicker{margin:0 0 7px!important;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#68745e!important}.closeButton{border:1px solid rgba(37,74,61,.14);border-radius:999px;padding:10px 15px;background:white;color:#29483d;font-weight:800;cursor:pointer}.dropZone{position:relative;display:grid;justify-items:center;gap:9px;margin:24px 0;padding:35px 20px;border:2px dashed rgba(37,74,61,.22);border-radius:22px;background:#f7faf7;text-align:center}.dropZone.dragging{border-color:#315849;background:#edf5ef}.dropZone input{position:absolute;width:1px;height:1px;opacity:0}.dropZone button{border:0;border-radius:999px;padding:12px 20px;background:#254a3d;color:white;font-weight:800;cursor:pointer}.dropZone button:disabled{opacity:.5}.fileIcon{font-size:34px;color:#315849}.dropZone small{color:#6f776f}.importError,.permissionNote{padding:15px 18px;border-radius:16px;background:#fff0ed;color:#813b32}.fileSummary{align-items:center;padding:15px 18px;border-radius:17px;background:#edf3eb}.fileSummary div{display:grid;gap:3px}.fileSummary span{font-size:12px;color:#687168}.safeBadge{padding:8px 12px;border-radius:999px;background:white;color:#315849!important;font-weight:800}.mappingSection,.previewSection{margin-top:24px;padding-top:24px;border-top:1px solid rgba(30,45,34,.09)}.mappingList{display:grid;gap:8px;margin:18px 0}.mappingRow{display:grid;grid-template-columns:minmax(170px,1fr) auto minmax(180px,.7fr) 110px;align-items:center;gap:12px;padding:13px 15px;border-radius:15px;background:rgba(244,247,242,.82)}.mappingRow>div{display:grid;gap:3px;min-width:0}.mappingRow small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#737b73}.mappingRow select{width:100%;padding:10px;border:1px solid rgba(37,74,61,.15);border-radius:11px;background:white}.mappingRow em{font-style:normal;font-size:11px;font-weight:900}.mappingRow em.review{color:#9a641c}.mappingRow em.clear{color:#2f6b4e}.permissionNote{background:#f2f0e7;color:#5e5948}.importStats{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:18px 0}.importStat{display:grid;gap:3px;padding:15px;border-radius:16px;background:#f3f7f2}.importStat strong{font-size:24px;color:#29483d}.importStat span{font-size:11px;color:#687168}.previewGrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:15px}.hierarchyPreview,.attentionPanel{padding:20px;border-radius:20px;background:#f8faf7;border:1px solid rgba(37,74,61,.08)}.hierarchyPreview h4,.attentionPanel h4{margin:0 0 14px;font-size:16px}.divisionNode{padding:12px;border-left:3px solid #315849}.departmentNodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:7px;margin-top:9px}.departmentNode{display:grid;gap:3px;padding:10px;border-radius:11px;background:white}.departmentNode small{color:#737b73}.attentionPanel p{color:#687168;line-height:1.45}.issueList{display:grid;gap:7px;max-height:330px;overflow:auto}.issueList div{padding:9px 10px;border-radius:10px;background:#fff5e8;color:#725329;font-size:12px}.peoplePreview{margin-top:15px;padding:15px;border-radius:16px;background:#f8faf7}.peoplePreview summary{cursor:pointer;font-weight:900}.tableScroll{overflow:auto;margin-top:12px}table{width:100%;border-collapse:collapse;min-width:900px}th,td{text-align:left;padding:10px;border-bottom:1px solid rgba(30,45,34,.08);font-size:12px}th{color:#526056}.futureButton{width:100%;margin-top:16px;padding:15px;border:0;border-radius:999px;background:#315849;color:white;font-weight:900;opacity:.55}.srOnly{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
        @media(max-width:1100px){.importStats{grid-template-columns:repeat(3,1fr)}.previewGrid{grid-template-columns:1fr}.mappingRow{grid-template-columns:minmax(150px,1fr) auto minmax(160px,1fr)}.mappingRow em{grid-column:3}}
        @media(max-width:700px){.importer{padding:19px}.importHeader,.sectionHeading,.fileSummary{flex-direction:column}.mappingRow{grid-template-columns:1fr}.mappingRow>span{display:none}.mappingRow em{grid-column:auto}.importStats{grid-template-columns:repeat(2,1fr)}.safeBadge{align-self:flex-start}}
      `}</style>
    </section>
  );
}
