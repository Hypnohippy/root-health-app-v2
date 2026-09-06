export const WORKFORCE_FIELDS = [
  { value: "ignore", label: "Ignore" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
  { value: "division", label: "Division / business unit" },
  { value: "location", label: "Site / location" },
  { value: "manager", label: "Manager" },
  { value: "job_title", label: "Job title" },
  { value: "employee_id", label: "Employee / reference ID" },
];

const FIELD_ALIASES = {
  name: ["name", "full name", "employee name", "worker name", "staff name", "person name"],
  email: ["email", "email address", "business email", "work email", "company email", "e mail"],
  department: ["department", "dept", "department name", "function", "functional area"],
  team: ["team", "team name", "cost centre", "cost center", "work group", "workgroup"],
  division: ["division", "business unit", "business area", "directorate", "company division"],
  location: ["location", "site", "office", "work location", "base", "region", "country"],
  manager: ["manager", "line manager", "reports to", "reporting manager", "supervisor", "manager email"],
  job_title: ["job title", "title", "position", "role title", "job role"],
  employee_id: ["employee id", "employee number", "staff id", "staff number", "person id", "reference id", "payroll id"],
};

function clean(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9@ ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
}

function headerScore(header, alias) {
  const source = normalise(header);
  const candidate = normalise(alias);
  if (!source || !candidate) return 0;
  if (source === candidate) return 1;
  if (source.includes(candidate) || candidate.includes(source)) return 0.84;

  const sourceWords = new Set(source.split(" "));
  const candidateWords = candidate.split(" ");
  const overlap = candidateWords.filter((word) => sourceWords.has(word)).length;
  return overlap ? 0.5 + 0.24 * (overlap / Math.max(sourceWords.size, candidateWords.length)) : 0;
}

function valueHint(field, values) {
  const populated = values.map(clean).filter(Boolean);
  if (!populated.length) return 0;
  if (field === "email") {
    const ratio = populated.filter(isEmail).length / populated.length;
    return ratio >= 0.7 ? 0.28 : 0;
  }
  return 0;
}

export function buildSourceColumns(headings = [], rows = []) {
  return headings.map((heading, index) => ({
    key: `column_${index}`,
    index,
    heading: clean(heading) || `Column ${index + 1}`,
    samples: rows.map((row) => clean(row?.[index])).filter(Boolean).slice(0, 4),
  }));
}

export function proposeWorkforceMappings(columns = []) {
  return Object.fromEntries(
    columns.map((column) => {
      const ranked = Object.entries(FIELD_ALIASES)
        .map(([field, aliases]) => ({
          field,
          score: Math.min(
            1,
            Math.max(...aliases.map((alias) => headerScore(column.heading, alias))) +
              valueHint(field, column.samples)
          ),
        }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0] || { field: "ignore", score: 0 };
      const second = ranked[1] || { score: 0 };
      const ambiguous = best.score < 0.65 || best.score - second.score < 0.12;
      const field = best.score >= 0.5 ? best.field : "ignore";
      return [
        column.key,
        {
          field,
          suggestedField: field,
          score: Number(best.score.toFixed(2)),
          confidence: ambiguous ? "review" : best.score >= 0.88 ? "high" : "medium",
          reviewed: false,
        },
      ];
    })
  );
}

export function createCanonicalWorkforceRows(rows = [], columns = [], mappings = {}) {
  return rows
    .filter((row) => Array.isArray(row) && row.some((value) => clean(value)))
    .map((row, rowIndex) => {
      const canonical = {
        source_row: rowIndex + 2,
        name: "",
        email: "",
        department: "",
        team: "",
        division: "",
        location: "",
        manager: "",
        job_title: "",
        employee_id: "",
      };

      columns.forEach((column) => {
        const target = mappings[column.key]?.field;
        if (target && target !== "ignore" && Object.hasOwn(canonical, target)) {
          const value = clean(row[column.index]);
          canonical[target] = canonical[target]
            ? `${canonical[target]} / ${value}`
            : value;
        }
      });
      return canonical;
    });
}

function duplicates(values) {
  const counts = new Map();
  values.map(normalise).filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}

function issue(type, message, row = null, field = null) {
  return { type, message, row, field };
}

export function validateWorkforcePreview({ rows = [], columns = [], mappings = {}, existingMembers = [] } = {}) {
  const issues = [];
  const duplicateEmails = duplicates(rows.map((row) => row.email));
  const duplicateIds = duplicates(rows.map((row) => row.employee_id));
  const existingEmails = new Set(existingMembers.map((member) => normalise(member.email)).filter(Boolean));
  const names = new Map();
  const emails = new Set();
  const employeeIds = new Set();

  rows.forEach((row) => {
    const nameKey = normalise(row.name);
    if (nameKey) names.set(nameKey, (names.get(nameKey) || 0) + 1);
    if (normalise(row.email)) emails.add(normalise(row.email));
    if (normalise(row.employee_id)) employeeIds.add(normalise(row.employee_id));
  });

  columns.forEach((column) => {
    const mapping = mappings[column.key];
    if (!mapping || (mapping.field === "ignore" && !mapping.reviewed)) {
      issues.push(issue("unmapped_column", `${column.heading} is not mapped.`, null, column.key));
    } else if (mapping.confidence === "review" && !mapping.reviewed) {
      issues.push(issue("ambiguous_column", `${column.heading} → ${WORKFORCE_FIELDS.find((item) => item.value === mapping.field)?.label || mapping.field} needs review.`, null, column.key));
    }
  });

  const mappedTargets = columns
    .map((column) => mappings[column.key]?.field)
    .filter((field) => field && field !== "ignore");
  duplicates(mappedTargets).forEach((field) => {
    issues.push(issue("duplicate_mapping", `More than one source column maps to ${WORKFORCE_FIELDS.find((item) => item.value === field)?.label || field}.`, null, field));
  });

  rows.forEach((row) => {
    if (!row.email || !isEmail(row.email)) {
      issues.push(issue("invalid_email", `Row ${row.source_row} has a missing or invalid email address.`, row.source_row, "email"));
    } else if (duplicateEmails.has(normalise(row.email))) {
      issues.push(issue("duplicate_email", `Row ${row.source_row} repeats ${row.email}.`, row.source_row, "email"));
    }
    if (row.employee_id && duplicateIds.has(normalise(row.employee_id))) {
      issues.push(issue("duplicate_employee_id", `Row ${row.source_row} repeats employee/reference ID ${row.employee_id}.`, row.source_row, "employee_id"));
    }
    if (![row.department, row.team, row.division, row.location].some(Boolean)) {
      issues.push(issue("missing_placement", `Row ${row.source_row} has no recognised organisational placement.`, row.source_row, "placement"));
    }
    if (row.email && existingEmails.has(normalise(row.email))) {
      issues.push(issue("existing_member", `Row ${row.source_row} appears to match an existing organisation member.`, row.source_row, "email"));
    }
    if (row.manager) {
      const managerKey = normalise(row.manager);
      const matches = (names.get(managerKey) || 0) + (emails.has(managerKey) ? 1 : 0) + (employeeIds.has(managerKey) ? 1 : 0);
      if (matches !== 1) {
        issues.push(issue("ambiguous_manager", `Row ${row.source_row} has a manager reference Root cannot match unambiguously.`, row.source_row, "manager"));
      }
    }
  });

  return {
    issues,
    attentionRows: new Set(issues.map((item) => item.row).filter(Boolean)).size,
    mappingIssues: issues.filter((item) => !item.row).length,
  };
}

function buildReviewedHierarchy(rows, hierarchyFields) {
  const roots = new Map();
  rows.forEach((row) => {
    let level = roots;
    hierarchyFields.forEach((field) => {
      const name = clean(row[field]);
      if (!name) return;
      const key = `${field}:${normalise(name)}`;
      if (!level.has(key)) level.set(key, { name, type: field === "location" ? "site" : field, children: new Map() });
      level = level.get(key).children;
    });
  });
  const serialise = (level) => [...level.values()].map((node) => ({ ...node, children: serialise(node.children) }));
  return serialise(roots);
}

export function buildWorkforcePreview({ rows = [], columns = [], mappings = {}, existingMembers = [], hierarchyFields } = {}) {
  const canonicalRows = createCanonicalWorkforceRows(rows, columns, mappings);
  const validation = validateWorkforcePreview({ rows: canonicalRows, columns, mappings, existingMembers });
  const unique = (field) => [...new Set(canonicalRows.map((row) => clean(row[field])).filter(Boolean))];
  const defaultHierarchyFields = columns
    .map((column) => mappings[column.key]?.field)
    .filter((field, index, fields) => ["division", "department", "team", "location"].includes(field) && fields.indexOf(field) === index);
  const reviewedHierarchyFields = Array.isArray(hierarchyFields) ? hierarchyFields : defaultHierarchyFields;

  return {
    canonicalRows,
    validation,
    summary: {
      people: canonicalRows.length,
      departments: unique("department").length,
      teams: unique("team").length,
      locations: unique("location").length,
      managers: unique("manager").length,
      attentionRows: validation.attentionRows,
    },
    hierarchyFields: reviewedHierarchyFields,
    hierarchy: buildReviewedHierarchy(canonicalRows, reviewedHierarchyFields),
  };
}
