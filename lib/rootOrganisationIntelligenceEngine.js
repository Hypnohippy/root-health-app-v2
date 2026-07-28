const MEASURE_DEFINITIONS = {
  sickness_days: {
    label: "Sickness days",
    unit: "number",
    lowerIsBetter: true,
    aliases: [
      "sickness days",
      "sick days",
      "absence days",
      "days absent",
      "days lost",
      "lost days",
      "sickness absence days",
      "absence total",
      "total absence",
    ],
  },

  turnover: {
    label: "Employee turnover",
    unit: "percentage",
    lowerIsBetter: true,
    aliases: [
      "employee turnover",
      "staff turnover",
      "turnover rate",
      "turnover percentage",
      "attrition",
      "attrition rate",
      "employee attrition",
      "staff attrition",
      "leaver rate",
      "leavers percentage",
    ],
  },

  agency_spend: {
    label: "Agency spend",
    unit: "currency",
    lowerIsBetter: true,
    aliases: [
      "agency spend",
      "agency cost",
      "agency costs",
      "temporary staff cost",
      "temporary staffing cost",
      "temporary staffing spend",
      "temp staff cost",
      "temp agency cost",
      "contingent labour cost",
    ],
  },

  overtime_hours: {
    label: "Overtime hours",
    unit: "number",
    lowerIsBetter: true,
    aliases: [
      "overtime hours",
      "overtime",
      "ot hours",
      "extra hours",
      "additional hours",
      "hours overtime",
    ],
  },

  vacancies: {
    label: "Current vacancies",
    unit: "number",
    lowerIsBetter: true,
    aliases: [
      "current vacancies",
      "open vacancies",
      "vacancies",
      "vacancy count",
      "open roles",
      "open positions",
      "unfilled roles",
      "unfilled posts",
    ],
  },
};

const DATE_WORDS = [
  "date",
  "month",
  "period",
  "week",
  "year",
  "quarter",
  "reporting period",
];

const TOTAL_WORDS = [
  "total",
  "overall",
  "all",
  "organisation",
  "company",
];

function normaliseText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_/\\-]+/g, " ")
    .replace(/[£$€,%()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value) {
  return normaliseText(value)
    .split(" ")
    .filter(Boolean);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const isNegativeInBrackets = /^\(.*\)$/.test(text);

  const cleaned = text
    .replace(/[£$€,%]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");

  const number = Number(cleaned);

  if (Number.isNaN(number)) {
    return null;
  }

  return isNegativeInBrackets ? -number : number;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (
    typeof value === "number" &&
    value > 20000 &&
    value < 80000
  ) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    const result = new Date(
      excelEpoch.getTime() + value * 86400000
    );

    return Number.isNaN(result.getTime()) ? null : result;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function similarityScore(label, aliases) {
  const normalisedLabel = normaliseText(label);

  if (!normalisedLabel) {
    return 0;
  }

  const labelTokens = new Set(tokenise(label));

  let best = 0;

  aliases.forEach((alias) => {
    const normalisedAlias = normaliseText(alias);

    if (normalisedLabel === normalisedAlias) {
      best = Math.max(best, 1);
      return;
    }

    if (
      normalisedLabel.includes(normalisedAlias) ||
      normalisedAlias.includes(normalisedLabel)
    ) {
      const ratio =
        Math.min(
          normalisedLabel.length,
          normalisedAlias.length
        ) /
        Math.max(
          normalisedLabel.length,
          normalisedAlias.length
        );

      best = Math.max(best, 0.82 + ratio * 0.14);
    }

    const aliasTokens = new Set(tokenise(alias));

    const overlap = [...labelTokens].filter((token) =>
      aliasTokens.has(token)
    );

    const union = new Set([
      ...labelTokens,
      ...aliasTokens,
    ]);

    const tokenScore =
      union.size > 0 ? overlap.length / union.size : 0;

    best = Math.max(best, tokenScore * 0.82);
  });

  return clamp(best);
}

function detectHeaderRow(matrix) {
  const maximumRows = Math.min(matrix.length, 20);

  let bestIndex = 0;
  let bestScore = -1;

  for (
    let rowIndex = 0;
    rowIndex < maximumRows;
    rowIndex += 1
  ) {
    const row = Array.isArray(matrix[rowIndex])
      ? matrix[rowIndex]
      : [];

    const populated = row.filter(
      (value) => String(value ?? "").trim() !== ""
    );

    if (populated.length < 2) {
      continue;
    }

    const textCells = populated.filter(
      (value) => parseNumeric(value) === null
    );

    const uniqueCells = new Set(
      populated.map((value) => normaliseText(value))
    );

    const measureHints = populated.reduce(
      (count, value) => {
        const matched = Object.values(
          MEASURE_DEFINITIONS
        ).some(
          (definition) =>
            similarityScore(
              value,
              definition.aliases
            ) >= 0.55
        );

        return count + (matched ? 1 : 0);
      },
      0
    );

    const score =
      populated.length * 0.4 +
      textCells.length * 0.8 +
      uniqueCells.size * 0.2 +
      measureHints * 3 -
      rowIndex * 0.08;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestIndex;
}

function makeUniqueHeaders(row) {
  const used = new Map();

  return row.map((value, index) => {
    const base =
      String(value ?? "").trim() ||
      `Column ${index + 1}`;

    const count = used.get(base) || 0;

    used.set(base, count + 1);

    return count === 0
      ? base
      : `${base} (${count + 1})`;
  });
}

function inspectSheet(workbook, XLSX, sheetName) {
  const worksheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json(
    worksheet,
    {
      header: 1,
      defval: "",
      raw: true,
    }
  );

  if (
    !Array.isArray(matrix) ||
    matrix.length === 0
  ) {
    return {
      sheetName,
      rowCount: 0,
      columnCount: 0,
      headerRowIndex: 0,
      headers: [],
      rows: [],
      matrix: [],
    };
  }

  const headerRowIndex = detectHeaderRow(matrix);

  const headers = makeUniqueHeaders(
    matrix[headerRowIndex] || []
  );

  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) =>
      Array.isArray(row)
        ? row.some(
            (value) =>
              String(value ?? "").trim() !== ""
          )
        : false
    )
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] ?? "",
        ])
      )
    );

  return {
    sheetName,
    rowCount: rows.length,
    columnCount: headers.length,
    headerRowIndex,
    headers,
    rows,
    matrix,
  };
}

function profileColumn(rows, header) {
  const values = rows
    .map((row) => row?.[header])
    .filter((value) => value !== "");

  const numericValues = values
    .map(parseNumeric)
    .filter((value) => value !== null);

  const dateValues = values
    .map(parseDateValue)
    .filter(Boolean);

  const percentageLike = values.filter((value) =>
    String(value).includes("%")
  ).length;

  const currencyLike = values.filter((value) =>
    /[£$€]/.test(String(value))
  ).length;

  return {
    populatedCount: values.length,

    numericCount: numericValues.length,

    numericRatio: values.length
      ? numericValues.length / values.length
      : 0,

    dateRatio: values.length
      ? dateValues.length / values.length
      : 0,

    percentageRatio: values.length
      ? percentageLike / values.length
      : 0,

    currencyRatio: values.length
      ? currencyLike / values.length
      : 0,

    numericValues,
  };
}

function findDateColumn(sheet) {
  const candidates = sheet.headers
    .map((header) => {
      const profile = profileColumn(
        sheet.rows,
        header
      );

      const nameMatch = DATE_WORDS.some(
        (word) =>
          normaliseText(header).includes(word)
      );

      const score =
        (nameMatch ? 0.55 : 0) +
        profile.dateRatio * 0.55;

      return {
        header,
        score,
      };
    })
    .filter((candidate) => candidate.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.header || null;
}

function findTotalRowIndex(sheet) {
  let best = null;

  sheet.rows.forEach((row, rowIndex) => {
    const rowText = Object.values(row)
      .map((value) => normaliseText(value))
      .filter(Boolean)
      .join(" ");

    const score = TOTAL_WORDS.reduce(
      (count, word) =>
        count + (rowText.includes(word) ? 1 : 0),
      0
    );

    if (
      score > 0 &&
      (!best || score > best.score)
    ) {
      best = {
        rowIndex,
        score,
      };
    }
  });

  return best?.rowIndex ?? null;
}

function chooseRepresentativeValue(
  sheet,
  header,
  definition
) {
  const dateColumn = findDateColumn(sheet);
  const totalRowIndex = findTotalRowIndex(sheet);

  const values = [];

  sheet.rows.forEach((row, rowIndex) => {
    const numeric = parseNumeric(row?.[header]);

    if (numeric === null) {
      return;
    }

    values.push({
      value: numeric,
      rowIndex,
      date: dateColumn
        ? parseDateValue(row?.[dateColumn])
        : null,
      raw: row?.[header],
    });
  });

  if (values.length === 0) {
    return {
      value: null,
      strategy: "No numeric value found",
      confidenceAdjustment: -0.45,
      series: [],
    };
  }

  if (totalRowIndex !== null) {
    const totalValue = values.find(
      (item) => item.rowIndex === totalRowIndex
    );

    if (totalValue) {
      return {
        value: totalValue.value,
        strategy: "Organisation total row",
        confidenceAdjustment: 0.12,
        series: values,
      };
    }
  }

  const datedValues = values.filter(
    (item) => item.date
  );

  if (datedValues.length > 0) {
    const latest = [...datedValues].sort(
      (a, b) => b.date - a.date
    )[0];

    return {
      value: latest.value,
      strategy: "Latest reporting period",
      confidenceAdjustment: 0.1,
      series: datedValues.sort(
        (a, b) => a.date - b.date
      ),
    };
  }

  if (values.length === 1) {
    return {
      value: values[0].value,
      strategy: "Only numeric value",
      confidenceAdjustment: 0.08,
      series: values,
    };
  }

  const headerText = normaliseText(header);

  if (
    headerText.includes("total") ||
    headerText.includes("current")
  ) {
    return {
      value: values[values.length - 1].value,
      strategy:
        "Last value in current or total column",
      confidenceAdjustment: 0.03,
      series: values,
    };
  }

  const sum = values.reduce(
    (total, item) => total + item.value,
    0
  );

  const average = sum / values.length;

  if (definition.unit === "percentage") {
    return {
      value: average,
      strategy: "Average of percentage values",
      confidenceAdjustment: -0.06,
      series: values,
    };
  }

  return {
    value: sum,
    strategy: "Sum of numeric values",
    confidenceAdjustment: -0.04,
    series: values,
  };
}

function buildMeasureCandidates(sheets) {
  const candidatesByMeasure = Object.fromEntries(
    Object.keys(MEASURE_DEFINITIONS).map(
      (key) => [key, []]
    )
  );

  sheets.forEach((sheet) => {
    sheet.headers.forEach((header) => {
      const profile = profileColumn(
        sheet.rows,
        header
      );

      Object.entries(
        MEASURE_DEFINITIONS
      ).forEach(([measureKey, definition]) => {
        const labelScore = similarityScore(
          header,
          definition.aliases
        );

        if (labelScore < 0.42) {
          return;
        }

        const unitBonus =
          definition.unit === "currency"
            ? profile.currencyRatio * 0.1
            : definition.unit === "percentage"
              ? profile.percentageRatio * 0.1
              : 0;

        const numericBonus =
          profile.numericRatio * 0.12;

        const chosen =
          chooseRepresentativeValue(
            sheet,
            header,
            definition
          );

        const confidence = clamp(
          labelScore * 0.76 +
            numericBonus +
            unitBonus +
            chosen.confidenceAdjustment
        );

        candidatesByMeasure[measureKey].push({
          measureKey,
          measureLabel: definition.label,
          sheetName: sheet.sheetName,
          header,
          value: chosen.value,
          valueStrategy: chosen.strategy,
          confidence,

          confidenceLabel:
            confidence >= 0.82
              ? "Strong"
              : confidence >= 0.62
                ? "Possible"
                : "Uncertain",

          populatedCount: profile.populatedCount,
          numericCount: profile.numericCount,
          series: chosen.series,
        });
      });
    });
  });

  Object.values(
    candidatesByMeasure
  ).forEach((candidates) => {
    candidates.sort(
      (a, b) => b.confidence - a.confidence
    );
  });

  return candidatesByMeasure;
}

function detectTrend(series) {
  if (
    !Array.isArray(series) ||
    series.length < 3
  ) {
    return null;
  }

  const values = series
    .map((item) => item.value)
    .filter(Number.isFinite);

  if (values.length < 3) {
    return null;
  }

  const first = values[0];
  const last = values[values.length - 1];

  const difference = last - first;

  const percentageChange =
    first !== 0
      ? (difference / Math.abs(first)) * 100
      : null;

  const movements = values
    .slice(1)
    .map(
      (value, index) =>
        value - values[index]
    );

  const positiveCount = movements.filter(
    (movement) => movement > 0
  ).length;

  const negativeCount = movements.filter(
    (movement) => movement < 0
  ).length;

  let direction = "stable";

  if (
    positiveCount >= movements.length * 0.67
  ) {
    direction = "increasing";
  }

  if (
    negativeCount >= movements.length * 0.67
  ) {
    direction = "decreasing";
  }

  return {
    direction,
    difference,
    percentageChange,
    points: values.length,
  };
}

function compareWithPrevious(
  value,
  previousValue
) {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(previousValue)
  ) {
    return null;
  }

  const difference = value - previousValue;

  const percentageChange =
    previousValue !== 0
      ? (difference / Math.abs(previousValue)) *
        100
      : null;

  return {
    difference,
    percentageChange,

    direction:
      difference > 0
        ? "increased"
        : difference < 0
          ? "decreased"
          : "unchanged",
  };
}

function buildFindings(
  mappings,
  previousReviews
) {
  const findings = [];

  const latestPrevious =
    Array.isArray(previousReviews)
      ? previousReviews[0]
      : null;

  Object.entries(mappings).forEach(
    ([measureKey, mapping]) => {
      if (
        !mapping ||
        !Number.isFinite(mapping.value)
      ) {
        return;
      }

      const definition =
        MEASURE_DEFINITIONS[measureKey];

      const trend = detectTrend(mapping.series);

      if (
        trend &&
        trend.direction !== "stable"
      ) {
        findings.push({
          id: `${measureKey}-trend`,
          type: "trend",
          measureKey,

          title:
            `${definition.label} is ` +
            trend.direction,

          detail:
            trend.percentageChange === null
              ? `${definition.label} moved across ${trend.points} recorded periods.`
              : `${definition.label} changed by ${Math.abs(
                  trend.percentageChange
                ).toFixed(1)}% across ${trend.points} recorded periods.`,

          confidence: mapping.confidenceLabel,
          direction: trend.direction,
          lowerIsBetter:
            definition.lowerIsBetter,
        });
      }

      const previousValue = latestPrevious
        ? Number(latestPrevious[measureKey])
        : NaN;

      const comparison =
        compareWithPrevious(
          mapping.value,
          previousValue
        );

      if (
        comparison &&
        comparison.direction !== "unchanged"
      ) {
        findings.push({
          id: `${measureKey}-previous`,
          type: "comparison",
          measureKey,

          title:
            `${definition.label} ` +
            `${comparison.direction} since the previous review`,

          detail:
            comparison.percentageChange === null
              ? `The recorded difference is ${Math.abs(
                  comparison.difference
                ).toLocaleString("en-GB")}.`
              : `The recorded change is ${Math.abs(
                  comparison.percentageChange
                ).toFixed(1)}%.`,

          confidence: mapping.confidenceLabel,

          direction:
            comparison.direction === "increased"
              ? "increasing"
              : "decreasing",

          lowerIsBetter:
            definition.lowerIsBetter,
        });
      }
    }
  );

  return findings;
}

function recommendationForFinding(finding) {
  const worsening = finding.lowerIsBetter
    ? finding.direction === "increasing"
    : finding.direction === "decreasing";

  if (!worsening) {
    return null;
  }

  const recommendations = {
    sickness_days: {
      title:
        "Review the drivers of sickness absence",

      action:
        "Break absence down by department, role, duration and repeated episodes, then review workload, management support and return-to-work practice in the areas showing the greatest movement.",

      successMeasures: [
        "Sickness days",
        "Repeat absence episodes",
        "Recovery and burnout scores",
      ],

      reviewWindow: "Review after 6–8 weeks",
    },

    turnover: {
      title:
        "Investigate where and why employees are leaving",

      action:
        "Compare turnover by department, role, tenure and manager. Combine exit evidence with burnout, workload and manager-confidence signals before choosing a retention response.",

      successMeasures: [
        "Employee turnover",
        "Retention by department",
        "Exit themes",
      ],

      reviewWindow: "Review after 8–12 weeks",
    },

    agency_spend: {
      title:
        "Review reliance on agency staffing",

      action:
        "Compare agency spend with vacancies, overtime and absence by service area. Identify whether the pressure is being driven by recruitment gaps, retention, scheduling or short-term demand.",

      successMeasures: [
        "Agency spend",
        "Vacancies",
        "Overtime hours",
      ],

      reviewWindow: "Review after 4–8 weeks",
    },

    overtime_hours: {
      title:
        "Investigate workload and staffing distribution",

      action:
        "Identify teams carrying sustained overtime, then review vacancies, shift design, workload allocation and manager capacity before introducing a wider wellbeing intervention.",

      successMeasures: [
        "Overtime hours",
        "Recovery scores",
        "Burnout scores",
      ],

      reviewWindow: "Review after 4–6 weeks",
    },

    vacancies: {
      title:
        "Examine recruitment and retention pressure",

      action:
        "Separate long-standing vacancies from recent openings and compare them with turnover, agency use and overtime. Prioritise roles where workforce pressure is affecting delivery or employee recovery.",

      successMeasures: [
        "Open vacancies",
        "Time to fill",
        "Agency spend",
        "Overtime hours",
      ],

      reviewWindow: "Review after 6–10 weeks",
    },
  };

  const recommendation =
    recommendations[finding.measureKey];

  if (!recommendation) {
    return null;
  }

  return {
    id:
      `recommendation-${finding.measureKey}`,

    priority: "High",
    measureKey: finding.measureKey,
    title: recommendation.title,
    action: recommendation.action,
    why: finding.detail,

    evidenceConfidence:
      finding.confidence,

    successMeasures:
      recommendation.successMeasures,

    reviewWindow:
      recommendation.reviewWindow,

    caution:
      "This is an evidence-led option for HR consideration, not a causal conclusion or a replacement for professional judgement.",
  };
}

function buildRecommendations(findings) {
  const unique = new Map();

  findings.forEach((finding) => {
    const recommendation =
      recommendationForFinding(finding);

    if (!recommendation) {
      return;
    }

    if (
      !unique.has(
        recommendation.measureKey
      )
    ) {
      unique.set(
        recommendation.measureKey,
        recommendation
      );
    }
  });

  return [...unique.values()];
}

function overallConfidence(mappings) {
  const values = Object.values(mappings)
    .filter(Boolean)
    .map((mapping) => mapping.confidence);

  if (values.length === 0) {
    return {
      label: "Emerging",
      score: 0,

      detail:
        "Root did not find enough confirmed organisation measures.",
    };
  }

  const score =
    values.reduce(
      (total, value) => total + value,
      0
    ) / values.length;

  if (score >= 0.82) {
    return {
      label: "Strong",
      score,

      detail:
        "Most imported measures have clear spreadsheet matches.",
    };
  }

  if (score >= 0.62) {
    return {
      label: "Developing",
      score,

      detail:
        "Several measures were recognised, but some require confirmation.",
    };
  }

  return {
    label: "Emerging",
    score,

    detail:
      "The spreadsheet contains possible matches that should be reviewed carefully.",
  };
}

export function buildOrganisationIntelligence({
  workbook,
  XLSX,
  previousReviews = [],
}) {
  if (
    !workbook ||
    !XLSX?.utils?.sheet_to_json
  ) {
    throw new Error(
      "A valid workbook and XLSX reader are required."
    );
  }

  const sheetNames = Array.isArray(
    workbook.SheetNames
  )
    ? workbook.SheetNames
    : [];

  if (sheetNames.length === 0) {
    throw new Error(
      "No worksheets were found in this workbook."
    );
  }

  const sheets = sheetNames.map(
    (sheetName) =>
      inspectSheet(
        workbook,
        XLSX,
        sheetName
      )
  );

  const candidates =
    buildMeasureCandidates(sheets);

  const mappings = {};
  const unresolvedMeasures = [];

  Object.entries(candidates).forEach(
    ([measureKey, measureCandidates]) => {
      const best =
        measureCandidates[0] || null;

      const second =
        measureCandidates[1] || null;

      if (
        !best ||
        best.value === null ||
        best.confidence < 0.5
      ) {
        mappings[measureKey] = null;

        unresolvedMeasures.push({
          measureKey,

          label:
            MEASURE_DEFINITIONS[
              measureKey
            ].label,

          reason:
            "No sufficiently reliable spreadsheet match was found.",

          candidates:
            measureCandidates.slice(0, 3),
        });

        return;
      }

      const ambiguous =
        second &&
        second.value !== null &&
        Math.abs(
          best.confidence -
            second.confidence
        ) < 0.08;

      mappings[measureKey] = {
        ...best,

        requiresConfirmation:
          best.confidence < 0.82 ||
          Boolean(ambiguous),

        alternativeCandidates:
          measureCandidates.slice(1, 4),
      };

      if (ambiguous) {
        unresolvedMeasures.push({
          measureKey,

          label:
            MEASURE_DEFINITIONS[
              measureKey
            ].label,

          reason:
            "Root found more than one plausible match.",

          candidates:
            measureCandidates.slice(0, 3),
        });
      }
    }
  );

  const findings = buildFindings(
    mappings,
    previousReviews
  );

  const recommendations =
    buildRecommendations(findings);

  const confidence =
    overallConfidence(mappings);

  return {
    workbookSummary: {
      workbookCount: 1,

      worksheetCount:
        sheets.length,

      rowCount: sheets.reduce(
        (total, sheet) =>
          total + sheet.rowCount,
        0
      ),

      columnCount: sheets.reduce(
        (total, sheet) =>
          total + sheet.columnCount,
        0
      ),

      recognisedMeasureCount:
        Object.values(mappings).filter(
          Boolean
        ).length,

      confirmedMeasureCount:
        Object.values(mappings).filter( 
          (mapping) =>
            mapping &&
            !mapping.requiresConfirmation
        ).length,

      confirmationRequiredCount:
        Object.values(mappings).filter(
          (mapping) =>
            mapping?.requiresConfirmation
        ).length,
    },

    sheets: sheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,

      headerRowNumber:
        sheet.headerRowIndex + 1,

      headers: sheet.headers,
    })),

    measureDefinitions:
      MEASURE_DEFINITIONS,

    candidates,
    mappings,
    unresolvedMeasures,
    findings,
    recommendations,
    confidence,

    generatedAt:
      new Date().toISOString(),

    cautions: [
      "Imported mappings must be reviewed before they are saved.",
      "Observed relationships do not prove causation.",
      "Recommendations support HR judgement and do not replace it.",
    ],
  };
}

export {
  MEASURE_DEFINITIONS,
};