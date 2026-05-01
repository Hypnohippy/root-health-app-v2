"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import GlassBody from "../../components/GlassBody";
import Nav from "../../components/Nav";

/* --- KEEP ALL YOUR CONSTANTS EXACTLY THE SAME --- */
/* (I have not touched your data structures) */


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

  const sameSignalHistory = usefulHistory.filter(
    (entry) => normalise(entry.signal) === normalise(selectedSignal)
  );

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

  setRankedHelp(ranked);

  const top = ranked[0];
  let predictedHelp = "";
  let confidence = null;

  if (whatHelped && whatHelped !== "Nothing yet") {
    predictedHelp = whatHelped;
  } else if (top) {
    const total = ranked.reduce((sum, [, count]) => sum + count, 0);
    confidence = Math.round((top[1] / total) * 100);
    predictedHelp = top[0];
  }

  // 🧠 detect failure pattern
  const failedAttempts = sameSignalHistory.filter(
    (e) => !e.what_helped || e.what_helped === "Nothing yet"
  ).length;

  const nothingWorked = failedAttempts >= 2;

  // 🧠 untried options
  const triedSet = new Set(
    sameSignalHistory
      .map((e) => e.what_helped)
      .filter((v) => v && normalise(v) !== "nothing yet")
  );

  const untriedOptions = helpOptions.filter(
    (opt) => opt !== "Nothing yet" && !triedSet.has(opt)
  );

  // save entry
  const { error: saveError } = await supabase.from("body_signals").insert([
    {
      areas: selectedItems.map((item) => item.label),
      system: selectedItems.map((item) => item.system).join(", "),
      signal: selectedSignal,
      context,
      intensity,
      what_helped: whatHelped || "",
    },
  ]);

  if (saveError) {
    setResponse("Something went wrong saving this entry.");
    setSaving(false);
    return;
  }

  let finalMessage = "";

  // -------------------------
  // MODE 1: ESCALATION
  // -------------------------
  if (context === "getting worse" && intensity >= 7 && nothingWorked) {
    let newIdeas = "";

    if (untriedOptions.length > 0) {
      newIdeas =
        "\n\nYou haven’t tried:\n" +
        untriedOptions.slice(0, 3).map((opt) => `• ${opt}`).join("\n");
    }

    finalMessage =
      `This looks like a pattern where things are not improving.\n\n` +
      `Rather than repeating the same approaches, shift strategy:\n` +
      `• Stop testing fixes for now\n` +
      `• Reduce load on this area\n` +
      `• Observe what changes without interference` +
      newIdeas +
      `\n\nIf this continues or worsens, it is worth getting it properly checked.\n\n`;
  }

  // -------------------------
  // MODE 2: NORMAL / LEARNING
  // -------------------------
  else {
    if (!nothingWorked && predictedHelp) {
      finalMessage += `Suggested focus: "${predictedHelp}".\n\n`;
      setSuggestedHelp(predictedHelp);
      setConfidenceScore(confidence);
    } else {
      setSuggestedHelp("");
      setConfidenceScore(null);
    }
  }

  // -------------------------
  // ADD BASE MESSAGE (ONCE ONLY)
  // -------------------------
  finalMessage += `${trendText}\n\n${buildBaseResponse()}`;

  // -------------------------
  // ADD USER LEARNING
  // -------------------------
  if (whatHelped && whatHelped !== "Nothing yet") {
    finalMessage +=
      `\n\nYou just found something useful: "${whatHelped}". Stay with that today if it feels right.`;
  }

  // FINAL SET (single write)
  setTrendInsight(trendText);
  setResponse(finalMessage);
  setSaving(false);
};
