// ONLY showing the FIXED PART (handleExplore)
// Everything else in your file stays EXACTLY the same

const handleExplore = async () => {
  if (selectedItems.length === 0 || !current || !selectedSignal || !context) return;

  setSaving(true);
  resetLearningUI();

  const { data: history } = await supabase
    .from("body_signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const usefulHistory = Array.isArray(history) ? history : [];

  // ✅ SINGLE SOURCE OF TRUTH (no duplicates anymore)
  const sameSignalHistory = usefulHistory.filter(
    (entry) => normalise(entry.signal) === normalise(selectedSignal)
  );

  // -----------------------------
  // 🧠 TREND ANALYSIS
  // -----------------------------
  const lastEntry = sameSignalHistory[0];
  const lastIntensity = lastEntry ? Number(lastEntry.intensity || 0) : null;

  let trendText = "";

  if (!lastEntry) {
    trendText = "This is the first time this signal has appeared in your recent history.";
  } else if (intensity <= lastIntensity - 2) {
    trendText = `This looks like it has eased since last time (${lastIntensity}/10 → ${intensity}/10).`;
  } else if (intensity >= lastIntensity + 2) {
    trendText = `This looks stronger than last time (${lastIntensity}/10 → ${intensity}/10).`;
  } else {
    trendText = `This is roughly similar to last time (${lastIntensity}/10 → ${intensity}/10).`;
  }

  // -----------------------------
  // 🧠 FAILURE + PATTERN BREAK
  // -----------------------------
  const triedHelps = new Set(
    sameSignalHistory
      .map((entry) => entry.what_helped)
      .filter((item) => item && normalise(item) !== "nothing yet")
  );

  const failedAttempts = sameSignalHistory.filter(
    (e) => !e.what_helped || e.what_helped === "Nothing yet"
  ).length;

  const repeatedFailure = failedAttempts >= 3;

  let patternBreak = false;

  if (sameSignalHistory.length >= 3) {
    const avg =
      sameSignalHistory.reduce((sum, e) => sum + (Number(e.intensity) || 0), 0) /
      sameSignalHistory.length;

    if (intensity >= avg + 2) {
      patternBreak = true;
    }
  }

  if (triedHelps.size >= 3 && repeatedFailure) {
    trendText =
      "You’ve tried several approaches and this signal is still not shifting. It may be time to simplify rather than try more.";
  }

  setTrendInsight(trendText);

  // -----------------------------
  // 🧠 LEARNING ENGINE
  // -----------------------------
  const helpCounts = {};

  sameSignalHistory.forEach((entry) => {
    if (entry.what_helped && normalise(entry.what_helped) !== "nothing yet") {
      helpCounts[entry.what_helped] = (helpCounts[entry.what_helped] || 0) + 1;
    }
  });

  if (whatHelped && whatHelped !== "Nothing yet") {
    helpCounts[whatHelped] = (helpCounts[whatHelped] || 0) + 1;
  }

  const ranked = Object.entries(helpCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const top = ranked[0];

  let predictedHelp = "";
  let confidence = null;

  if (whatHelped && whatHelped !== "Nothing yet") {
    predictedHelp = whatHelped;
    setSuggestedHelp(whatHelped);
    setConfidenceScore(null);
  } else if (top) {
    const total = ranked.reduce((sum, [, c]) => sum + c, 0);
    confidence = Math.round((top[1] / total) * 100);
    predictedHelp = top[0];
    setSuggestedHelp(predictedHelp);
    setConfidenceScore(confidence);
  }

  setRankedHelp(ranked);

  // -----------------------------
  // 💾 SAVE ENTRY
  // -----------------------------
  const entryToSave = {
    areas: selectedItems.map((item) => item.label),
    system: selectedItems.map((item) => item.system).join(", "),
    signal: selectedSignal,
    context,
    intensity,
    what_helped: whatHelped || "",
  };

  const { error: saveError } = await supabase.from("body_signals").insert([entryToSave]);

  if (saveError) {
    setResponse("Something went wrong saving this entry.");
    setSaving(false);
    return;
  }

  // -----------------------------
  // 🧠 RESPONSE BUILD
  // -----------------------------
  let message = buildBaseResponse();

  if (patternBreak) {
    message = `This is outside your usual pattern.\n\n` + message;
  }

  if (repeatedFailure) {
    message += `\n\nWhat you’ve tried hasn’t worked so far — avoid repeating the same approach. Try something different or reduce variables.`;
  }

  if (trendText) {
    message = `${trendText}\n\n` + message;
  }

  const needsEscalation =
    context === "getting worse" &&
    intensity >= 7 &&
    (!whatHelped || whatHelped === "Nothing yet");

  if (needsEscalation) {
    setSuggestedHelp("");
    setConfidenceScore(null);

    message =
      `This needs attention.\n\n` +
      `Because it is worsening and high intensity (${intensity}/10), reduce load and monitor closely.\n\n` +
      message;
  } else if (predictedHelp) {
    message = `Suggested focus: "${predictedHelp}".\n\n` + message;
  }

  if (whatHelped && whatHelped !== "Nothing yet") {
    message += `\n\nYou just found something useful: "${whatHelped}".`;
  }

  setResponse(message);
  setSaving(false);
};
