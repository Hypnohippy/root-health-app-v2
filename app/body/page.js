"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import DigestionView from "../../components/body/DigestionView";
import HeartView from "../../components/body/HeartView";
import LungsView from "../../components/body/LungsView";
import SkinView from "../../components/body/SkinView";
import JointsView from "../../components/body/JointsView";
import KidneysView from "../../components/body/KidneysView";
import SensesView from "../../components/body/SensesView";
import NervousSystemView from "../../components/body/NervousSystemView";
import { getCurrentProfileKey } from "../../lib/currentUser";

const bodySystems = [
  { id: "stress_nerves", label: "Head / nervous system", system: "nervous/autonomic", signals: ["overwhelm", "racing thoughts", "panic feeling", "tension", "wired but tired", "shaky", "numb or detached", "hard to settle"] },
  { id: "heart_circulation", label: "Heart & circulation", system: "circulatory", signals: ["racing heart", "fluttering", "pressure", "cold hands/feet", "light-headed", "low stamina", "swelling", "colour change"] },
  { id: "breathing", label: "Chest & breathing", system: "respiratory", signals: ["shallow breathing", "tight chest", "breathlessness", "air hunger", "cough", "wheeze", "sighing", "chest heaviness"] },
  { id: "digestion", label: "Stomach / gut", system: "digestive", signals: ["bloating", "reflux", "cramps", "constipation", "loose bowels", "nausea", "appetite change", "wind/gas", "food sensitivity"] },
  { id: "reproductive", label: "Pelvis & reproductive", system: "reproductive/pelvic", signals: ["pelvic discomfort", "groin discomfort", "genital irritation", "burning", "itching", "discharge/change", "swelling", "rash or blistering", "cycle-related change", "sexual discomfort"] },
  { id: "hormones_balance", label: "Hormones & balance", system: "endocrine", signals: ["cravings", "energy dips", "mood swings", "temperature changes", "sweats", "cycle changes", "skin changes", "sleep disruption", "weight change"] },
  { id: "bladder_hydration", label: "Kidneys / bladder", system: "urinary/excretory", signals: ["thirst", "frequent urination", "burning when passing urine", "dark urine", "fluid retention", "lower back discomfort", "urgency", "reduced urination"] },
  { id: "muscles_joints", label: "Muscles & joints", system: "musculoskeletal", signals: ["aching", "stiffness", "sharp pain", "deep ache", "weakness", "cramps", "reduced movement", "swelling", "clicking/grinding"] },
  { id: "skin", label: "Skin / dermis", system: "skin/barrier", signals: ["rash", "blistering", "redness", "itching", "dryness", "spots", "sensitivity", "swelling", "colour change", "visible change but no feeling", "slow healing"] },
  { id: "senses", label: "Senses", system: "sensory", signals: ["eye strain", "blurred vision", "light sensitivity", "noise sensitivity", "dizziness", "tingling", "numbness", "ringing ears", "altered smell/taste"] },
  { id: "energy_recovery", label: "Whole body energy", system: "whole-body recovery", signals: ["fatigue", "burnout feeling", "heavy body", "low motivation", "poor recovery", "weakness", "brain fog", "flu-like feeling", "generally depleted"] },
  { id: "sleep_rhythm", label: "Sleep rhythm", system: "circadian/sleep", signals: ["poor sleep", "waking often", "early waking", "tired on waking", "sleepy daytime", "wired at night", "restless sleep", "night sweats"] },
];

const bodyZones = [
  { id: "stress_nerves", top: "7%", left: "42%", width: "16%", height: "12%" },
  { id: "senses", top: "10%", left: "39%", width: "22%", height: "10%" },
  { id: "breathing", top: "24%", left: "33%", width: "34%", height: "12%" },
  { id: "heart_circulation", top: "25%", left: "48%", width: "16%", height: "10%" },
  { id: "digestion", top: "39%", left: "38%", width: "24%", height: "14%" },
  { id: "hormones_balance", top: "45%", left: "37%", width: "26%", height: "16%" },
  { id: "bladder_hydration", top: "46%", left: "35%", width: "30%", height: "16%" },
  { id: "reproductive", top: "64%", left: "38%", width: "24%", height: "9%" },
  { id: "skin", top: "22%", left: "20%", width: "12%", height: "62%" },
  { id: "muscles_joints", top: "26%", left: "68%", width: "14%", height: "62%" },
  { id: "energy_recovery", top: "72%", left: "34%", width: "32%", height: "18%" },
];

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "after eating",
  "under stress",
  "after movement",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Drank more water",
  "Ate differently",
  "Rested",
  "Reduced stress",
  "Moved/exercised",
  "Improved sleep",
  "Nothing yet",
];

const signalGuidance = {
  reflux: [
    "Stay upright for 30–60 minutes after eating",
    "Try smaller meals and slower eating today",
    "Reduce heavy, spicy, acidic, or very late meals for now",
  ],

  bloating: [
    "Slow eating down and avoid rushing meals",
    "Notice whether stress or certain foods increase symptoms",
    "Gentle walking after food may help movement and pressure",
  ],

  constipation: [
    "Increase water steadily across the day",
    "Add gentle fibre such as oats, kiwi, fruit, or vegetables",
    "Movement and walking may help stimulate the bowel naturally",
  ],

  cramps: [
    "Use warmth and reduce physical strain for now",
    "Notice dehydration, stress, or food triggers",
    "Gentle stretching or walking may reduce tension",
  ],

  nausea: [
    "Keep food light and simple for now",
    "Small sips of water or ginger may help settle things",
    "Avoid forcing heavy meals if appetite is low",
  ],

  "food sensitivity": [
    "Keep meals simple and notice repeat triggers",
    "Highly processed foods may worsen irritation",
    "Track patterns rather than reacting to one meal alone",
  ],

  "racing heart": [
    "Reduce stimulation and slow things down briefly",
    "Notice caffeine, stress, dehydration, or exhaustion today",
    "Gentle slow breathing may help the nervous system settle",
  ],

  fluttering: [
    "Pause and reduce stimulation for a few minutes",
    "Notice stress, caffeine, dehydration, or fatigue",
    "Track whether it settles or keeps repeating",
  ],

  pressure: [
    "Reduce physical strain until it settles",
    "Notice stress, exertion, or posture today",
    "If unusual, worsening, or chest-related, get checked urgently",
  ],

  "tight chest": [
    "Relax the shoulders and avoid shallow breathing",
    "Slow the out-breath gently rather than forcing deep breaths",
    "Reduce stress and stimulation where possible",
  ],

  breathlessness: [
    "Pause and reduce demand on the body",
    "Sit upright and allow breathing to settle naturally",
    "If severe, worsening, or unusual, seek medical help urgently",
  ],

  wheeze: [
    "Notice cold air, exertion, allergens, or stress",
    "Avoid pushing through symptoms today",
    "Seek medical advice if wheezing is new or worsening",
  ],

  "shallow breathing": [
    "Relax the jaw and shoulders first",
    "Focus on slower breathing rather than deeper breathing",
    "Reduce stimulation and stress for a while",
  ],

  coughing: [
    "Hydration and warm fluids may help irritation",
    "Notice air quality, illness, or environmental triggers",
    "Persistent or worsening coughs should be medically reviewed",
  ],

  itching: [
    "Reduce irritation where possible",
    "Notice soaps, detergents, heat, stress, or fabrics",
    "Support the skin barrier gently with moisturising",
  ],

  dryness: [
    "Use gentle moisturising regularly",
    "Avoid overwashing or harsh skin products",
    "Hydration, sleep, and stress may affect skin recovery",
  ],

  redness: [
    "Reduce irritation and heat exposure",
    "Notice stress, friction, or skincare triggers",
    "Avoid aggressive scrubbing or harsh products",
  ],

  rash: [
    "Avoid scratching or adding multiple new products",
    "Track whether it spreads, heats up, or becomes painful",
    "Seek medical advice if worsening or persistent",
  ],

  burning: [
    "Reduce irritation and avoid harsh products or strain",
    "Hydration and rest may help reduce irritation",
    "Persistent burning symptoms should be medically assessed",
  ],

  swelling: [
    "Rest the area and reduce strain where possible",
    "Hydration and movement balance may help circulation",
    "Rapid or severe swelling should be checked urgently",
  ],

  aching: [
    "Gentle movement is often better than complete immobility",
    "Warmth and stretching may help reduce tension",
    "Avoid pushing hard through pain today",
  ],

  stiffness: [
    "Slow gentle movement may help loosen the area",
    "Heat, mobility work, and hydration may help",
    "Long periods sitting still may worsen stiffness",
  ],

  weakness: [
    "Reduce physical demand temporarily",
    "Support recovery with rest, hydration, and nutrition",
    "Persistent or worsening weakness should be assessed",
  ],

  cramps: [
    "Hydration and electrolytes may help",
    "Reduce overexertion temporarily",
    "Gentle stretching may reduce tension",
  ],

  "clicking/grinding": [
    "Reduce repetitive strain temporarily",
    "Notice posture, movement pattern, and overuse",
    "If painful or worsening, get it assessed",
  ],

  thirst: [
    "Increase fluids steadily rather than all at once",
    "Notice heat, stress, blood sugar, exercise, or dehydration",
    "Persistent excessive thirst should be medically reviewed",
  ],

  "dark urine": [
    "Increase hydration steadily through the day",
    "Notice heat, sweating, supplements, or dehydration",
    "Persistent dark urine should be checked medically",
  ],

  "frequent urination": [
    "Notice caffeine, hydration timing, and stress",
    "Track whether it worsens overnight",
    "If painful or persistent, seek medical advice",
  ],

  urgency: [
    "Reduce bladder irritants like caffeine temporarily",
    "Hydration balance matters — avoid both extremes",
    "Persistent urgency should be medically assessed",
  ],

  "lower back discomfort": [
    "Notice posture, lifting, stress, and hydration",
    "Gentle movement may help more than total rest",
    "Seek help if severe or linked to urinary symptoms",
  ],

  "reduced urination": [
    "Hydrate steadily and monitor changes",
    "Notice heat, illness, dehydration, or medications",
    "Seek medical advice if significant or persistent",
  ],

  overwhelm: [
    "Reduce stimulation and multitasking temporarily",
    "Focus on one small thing rather than everything at once",
    "Allow the nervous system to slow before making decisions",
  ],

  "racing thoughts": [
    "Externalise thoughts by writing things down",
    "Reduce information and screen overload briefly",
    "Longer out-breaths may help calm nervous system activation",
  ],

  tension: [
    "Relax shoulders, jaw, and breathing first",
    "Movement and stretching may help discharge stress",
    "Notice what situations increase body tension",
  ],

  "panic feeling": [
    "Orient to the environment slowly and gently",
    "Lengthen the out-breath without forcing it",
    "Seek support if symptoms feel severe or unsafe",
  ],

  "wired but tired": [
    "Reduce stimulation rather than forcing productivity",
    "Notice caffeine, stress, screen exposure, and sleep",
    "Prioritise recovery over pushing harder today",
  ],

  shaky: [
    "Pause and stabilise food, hydration, and breathing",
    "Notice caffeine, stress, blood sugar, or exhaustion",
    "Persistent shaking should be medically reviewed",
  ],

  dizziness: [
    "Sit down and slow movement briefly",
    "Hydration, food intake, and fatigue may contribute",
    "Severe or repeated dizziness should be assessed",
  ],

  "blurred vision": [
    "Reduce eye strain and screen intensity briefly",
    "Hydration, fatigue, and stress may affect vision",
    "Persistent or sudden changes should be medically checked",
  ],

  "light sensitivity": [
    "Reduce bright light exposure temporarily",
    "Rest the eyes and reduce stimulation",
    "Track whether headaches or stress link to symptoms",
  ],
    "tired eyes": [
    "Reduce screen intensity and give the eyes short breaks every 20–30 minutes",
    "Hydration, sleep, stress, and prolonged focus can all contribute to eye fatigue",
    "Looking into the distance or natural light may help reduce strain",
  ],

  "eye strain": [
    "Reduce prolonged screen focus temporarily",
    "Blinking more regularly and adjusting lighting may help",
    "Poor sleep, stress, and dehydration may worsen strain",
  ],

  "blurred vision": [
    "Pause screen use briefly and rest the eyes",
    "Hydration, fatigue, blood sugar, and stress can affect vision",
    "Sudden or persistent visual changes should be medically assessed",
  ],

  "light sensitivity": [
    "Reduce bright screens and harsh lighting temporarily",
    "Allow the nervous system and eyes to settle in a calmer environment",
    "Notice whether headaches, fatigue, or stress link to symptoms",
  ],

  "ringing": [
    "Reduce noise exposure and overstimulation temporarily",
    "Stress and fatigue can increase nervous system sensitivity",
    "Persistent ringing or hearing changes should be medically assessed",
  ],

  "sound sensitivity": [
    "Reduce layered noise and overstimulation for a while",
    "The nervous system may be overloaded rather than damaged",
    "Rest and calmer environments may help symptoms settle",
  ],

  "altered smell": [
    "Notice illness, congestion, stress, medication, or environmental triggers",
    "Avoid heavy chemical or perfume exposure temporarily",
    "Persistent smell changes should be medically reviewed",
  ],

  "altered taste": [
    "Hydration, illness, reflux, medication, and stress can affect taste",
    "Keep meals simple and notice repeat patterns",
    "Persistent or sudden changes should be medically assessed",
  ],

  tingling: [
    "Reduce pressure and tension on the area if possible",
    "Stress, posture, circulation, or nerve irritation may contribute",
    "Persistent or worsening tingling should be medically checked",
  ],

  numbness: [
    "Notice posture, pressure, circulation, or stress levels",
    "Avoid prolonged compression or repetitive strain",
    "Sudden or worsening numbness should be medically assessed",
  ],

  "ringing ears": [
    "Reduce noise exposure and overstimulation",
    "Stress and fatigue can increase awareness of ringing",
    "Persistent tinnitus should be medically assessed",
  ],

  fatigue: [
    "Reduce non-essential demand temporarily",
    "Hydration, nutrition, movement, and sleep all matter",
    "Recovery is often slower when stress remains high",
  ],

  "brain fog": [
    "Reduce overload and simplify tasks briefly",
    "Sleep, hydration, blood sugar, and stress may contribute",
    "Gentle movement and recovery may help clarity",
  ],

  "poor recovery": [
    "Reduce intensity and allow more recovery time",
    "Hydration, sleep, and nutrition are foundational",
    "Stress load can slow physical recovery significantly",
  ],
    senses: [
    "Reduce sensory load for 10–20 minutes: lower lights, reduce noise, and pause screens",
    "Hydrate and give your eyes or nervous system a short recovery window",
    "If symptoms are sudden, severe, one-sided, linked with weakness, or do not settle, seek medical advice",
  ],

  sensory: [
    "Reduce sensory load for 10–20 minutes: lower lights, reduce noise, and pause screens",
    "Hydrate and give your eyes or nervous system a short recovery window",
    "If symptoms are sudden, severe, one-sided, linked with weakness, or do not settle, seek medical advice",
  ],

  "sensory overload": [
    "Reduce sensory input for 10–20 minutes: lower lights, reduce noise, and pause notifications",
    "Move to one calm environment rather than trying to push through stimulation",
    "Try slow breathing, stillness, or a short quiet walk to help the nervous system settle",
  ],

  "tired eyes": [
    "Reduce screen intensity and give the eyes short breaks every 20–30 minutes",
    "Hydration, sleep, stress, and prolonged focus can all contribute to eye fatigue",
    "Looking into the distance or natural light may help reduce strain",
  ],

  default: [
    "Reduce load on the affected system for a short period rather than pushing through",
    "Support the basics first: hydration, food, rest, gentle movement, and lower stress",
    "If symptoms persist, worsen, feel unusual, or worry you, seek medical advice",
  ],
    senses: [
    "Reduce sensory load for 10–20 minutes: lower lights, reduce noise, and pause screens",
    "Hydration, sleep, and nervous system overload can all affect sensory symptoms",
    "If symptoms are sudden, severe, one-sided, or persistent, seek medical advice",
  ],

  skin: [
    "Reduce irritation and support the skin barrier gently today",
    "Hydration, stress, soaps, heat, and food can all influence skin symptoms",
    "If symptoms worsen, spread, blister, or persist, seek medical advice",
  ],

  breathing: [
    "Slow the breathing gently and reduce physical demand temporarily",
    "Stress, posture, illness, and nervous system activation may affect breathing",
    "Seek urgent medical help for severe or worsening breathing symptoms",
  ],

  digestion: [
    "Keep meals simple and reduce digestive load temporarily",
    "Hydration, slower eating, stress reduction, and gentle movement may help",
    "Persistent or worsening digestive symptoms should be medically assessed",
  ],

  bladder_hydration: [
    "Support hydration steadily through the day rather than all at once",
    "Notice caffeine, stress, dehydration, heat, or illness patterns",
    "Persistent urinary symptoms should be medically assessed",
  ],

  muscles_joints: [
    "Gentle movement is often better than total immobility",
    "Hydration, stretching, warmth, and recovery may help symptoms settle",
    "Persistent swelling, weakness, or pain should be medically assessed",
  ],

  stress_nerves: [
    "Reduce stimulation and slow the nervous system down briefly",
    "Focus on hydration, breathing, sleep, and lowering overload",
    "Persistent neurological or panic-like symptoms should be medically assessed",
  ],

  heart_circulation: [
    "Reduce physical strain temporarily and allow the body to settle",
    "Hydration, stress, sleep, and stimulation can affect circulation symptoms",
    "Chest pain, severe breathlessness, or fainting require urgent medical attention",
  ],

  default: [
    "Reduce load on the affected system temporarily rather than pushing through",
    "Support hydration, sleep, food, movement, and recovery today",
    "If symptoms persist, worsen, or feel unusual, seek medical advice",
  ],
};
function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

export default function BodyPage() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [context, setContext] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [whatHelped, setWhatHelped] = useState("");
  const [response, setResponse] = useState("");
  const [suggestedHelp, setSuggestedHelp] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [rankedHelp, setRankedHelp] = useState([]);
  const [trendInsight, setTrendInsight] = useState("");
  const [saving, setSaving] = useState(false);
  const [journeyStep, setJourneyStep] = useState("body");
  const [journey, setJourney] = useState(null);
  const [journeyIntro, setJourneyIntro] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const selectedItems = bodySystems.filter((item) => selectedSystems.includes(item.id));
  const current = bodySystems.find((item) => item.id === activeSystemId);
  useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 900);
  };

  checkMobile();
  window.addEventListener("resize", checkMobile);

  return () => window.removeEventListener("resize", checkMobile);
}, []);
  useEffect(() => {
  const stored = localStorage.getItem("root_journey_v1");

  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);

    setJourney(parsed);

    if (parsed.focus === "anxiety") {
      setJourneyIntro(
        "We’re beginning by exploring how anxiety may be showing up in your body."
      );
    }

    else if (parsed.focus === "sleep") {
      setJourneyIntro(
        "Sleep disruption often begins with nervous system overload and body tension."
      );
    }

    else if (parsed.focus === "body") {
      setJourneyIntro(
        "Let’s gently explore where your body seems to be carrying pressure."
      );
    }

    else if (parsed.focus === "thoughts") {
      setJourneyIntro(
        "Thought pressure often affects the body before we fully notice the mental load."
      );
    }

    else if (parsed.focus === "heavy") {
      setJourneyIntro(
        "Emotional heaviness can affect energy, tension, digestion, and nervous system balance."
      );
    }

    else if (parsed.focus === "patterns") {
      setJourneyIntro(
        "We’re beginning by listening to the body first, because patterns often appear there early."
      );
    }
  } catch (err) {
    console.log(err);
  }
}, []);

  const resetLearningUI = () => {
    setResponse("");
    setSuggestedHelp("");
    setConfidenceScore(null);
    setRankedHelp([]);
    setTrendInsight("");
  };

  const selectSystem = (id) => {
    setSelectedSystems((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveSystemId(id);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setWhatHelped("");
    resetLearningUI();

    if (id === "stress_nerves") {
      setJourneyStep("nervous");
    } else if (id === "digestion") {
      setJourneyStep("digestion");
    } else if (id === "heart_circulation") {
      setJourneyStep("heart");
    } else if (id === "breathing") {
      setJourneyStep("lungs");
    } else if (id === "skin") {
      setJourneyStep("skin");
    } else if (id === "muscles_joints") {
      setJourneyStep("joints");
    } else if (id === "bladder_hydration") {
  setJourneyStep("kidneys");
} else if (id === "senses") {
  setJourneyStep("senses");
} else {
      setJourneyStep("signals");
    }
  };

  const clearSelections = () => {
    setSelectedSystems([]);
    setActiveSystemId(null);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setWhatHelped("");
    setJourneyStep("body");
    resetLearningUI();
  };

  const buildBaseResponse = () => {
    const labels = selectedItems.map((item) => item.label.toLowerCase()).join(", ");
    let message = `You’ve marked ${labels}. Right now we’re looking at ${selectedSignal} around ${current.label.toLowerCase()}.`;
    message += ` It is ${context}, sitting around ${intensity}/10.`;

    if (context === "improving") {
      message += `\n\nThis looks like it may be settling. That is useful information — your system may already be responding to something you changed.`;
    } else if (context === "getting worse") {
      message += `\n\nThis looks like it may be building. Rather than pushing through, it is worth slowing down and supporting this area today.`;
    } else if (context === "constant") {
      message += `\n\nBecause this is hanging around, it may be worth looking for what is maintaining it rather than treating it as a one-off.`;
    } else {
      message += `\n\nLet’s read this as information from your body, not something to panic about.`;
    }

    const signalKey = normalise(selectedSignal);

const specific =
  signalGuidance[signalKey] ||
  signalGuidance[signalKey.replace(/\s+/g, " ")] ||
  signalGuidance[signalKey.replace("/", " / ")] ||
  signalGuidance[current?.id] ||
  signalGuidance[current?.system] ||
  signalGuidance.default;

message += `\n\nA practical next step could be:`;

   if (specific && Array.isArray(specific) && specific.length > 0) {
  specific.forEach((item) => {
    message += `\n• ${item}`;
  });
} else {
  message += `\n• Reduce load on this system temporarily rather than pushing through`;
  message += `\n• Support hydration, sleep, food, gentle movement, and recovery today`;
  message += `\n• If symptoms persist, worsen, feel unusual, or worry you, seek medical advice`;
}

    if (
      intensity >= 8 ||
      selectedSignal.includes("blister") ||
      selectedSignal.includes("discharge") ||
      selectedSignal.includes("burning") ||
      selectedSignal.includes("racing heart") ||
      selectedSignal.includes("pressure") ||
      selectedSignal.includes("tight chest") ||
      selectedSignal.includes("breathlessness") ||
      selectedSignal.includes("wheeze") ||
      selectedSignal.includes("rash") ||
      selectedSignal.includes("swelling") ||
      selectedSignal.includes("dark urine") ||
      selectedSignal.includes("reduced urination") ||
      selectedSignal.includes("panic")
    ) {
      message += `\n\nBecause this is strong, chest-related, breathing-related, urinary-related, visible, sensitive, unusual, or worrying, it is worth getting checked urgently if it persists, worsens, spreads, comes with severe pain, fainting, significant breathlessness, fever, or feels unusual for you.`;
    }

    return message;
  };

  const handleExplore = async () => {
    if (selectedItems.length === 0 || !current || !selectedSignal || !context) return;

    setSaving(true);
    resetLearningUI();
    const profileKey = getCurrentProfileKey();

if (!profileKey) {
  window.location.href = "/reconnect";
  return;
}
  
  const { data: history } = await supabase
  .from("body_signals")
  .select("*")
  .eq("profile_key", profileKey)
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
      trendText = `This looks stronger than last time (${lastIntensity}/10 → ${intensity}/10). It may be worth slowing down and watching it more closely.`;
    } else {
      trendText = `This is roughly similar to last time (${lastIntensity}/10 → ${intensity}/10).`;
    }

    setTrendInsight(trendText);

    const helpCounts = {};
    sameSignalHistory.forEach((entry) => {
      if (entry.what_helped && normalise(entry.what_helped) !== "nothing yet") {
        helpCounts[entry.what_helped] = (helpCounts[entry.what_helped] || 0) + 1;
      }
    });

    if (whatHelped && whatHelped !== "Nothing yet") {
      helpCounts[whatHelped] = (helpCounts[whatHelped] || 0) + 1;
    }

    const ranked = Object.entries(helpCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const top = ranked[0];

    if (whatHelped && whatHelped !== "Nothing yet") {
      setSuggestedHelp(whatHelped);
      setConfidenceScore(null);
    } else if (top) {
      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      setSuggestedHelp(top[0]);
      setConfidenceScore(Math.round((top[1] / total) * 100));
    }

    setRankedHelp(ranked);
    
if (journey) {
  const updatedJourney = {
    ...journey,
    bodyAreas: selectedItems.map((item) => item.label),
    selectedSignal,
    intensity,
    completedBody: true,
    nextSuggested: "mind",
  };

  localStorage.setItem(
    "root_journey_v1",
    JSON.stringify(updatedJourney)
  );
}

    const entryToSave = {
      profile_key: profileKey,
      areas: selectedItems.map((item) => item.label),
      system: selectedItems.map((item) => item.system).join(", "),
      signal: selectedSignal,
      context,
      intensity,
      what_helped: whatHelped || "",
    };

    const { error: saveError } = await supabase.from("body_signals").insert([entryToSave]);

    if (saveError) {
      setResponse("Something went wrong saving this entry. Please try again.");
      setSaving(false);
      return;
    }

    let message = trendText ? `${trendText}\n\n${buildBaseResponse()}` : buildBaseResponse();

    if (whatHelped && whatHelped !== "Nothing yet") {
      message += `\n\nYou just found something useful: "${whatHelped}". Stay with that today if it feels right — this is the kind of feedback Root Health can learn from.`;
    }

    setResponse(message);
    setJourneyStep("body");
    setSaving(false);
  };

 return (
  <RootAtmosphere type="body">
 <Nav />

       <main style={styles.page}>      <style>{`
        @keyframes digestivePop { 0% { opacity: 0; transform: scale(0.88) translateX(-28px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes heartPop { 0% { opacity: 0; transform: scale(0.88) translateX(-24px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes lungsPop { 0% { opacity: 0; transform: scale(0.88) translateX(-24px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes skinPop { 0% { opacity: 0; transform: scale(0.88) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes jointsPop { 0% { opacity: 0; transform: scale(0.88) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes kidneysPop { 0% { opacity: 0; transform: scale(0.88) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes nervousPop { 0% { opacity: 0; transform: scale(0.88) translateX(-20px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @media (max-width: 900px) {
  main {
    overflow-x: hidden;
  }

  .root-mobile-stack {
    max-height: none !important;
  }
}
      `}</style>
  

      <div style={styles.backgroundWash} />

      <header style={styles.topBar}>
        <a href="/" style={styles.iconButton}>←</a>
        <RootEnso size={58} />
        <button style={styles.iconButton}>☰</button>
      </header>

     <section style={isMobile ? { ...styles.stage, ...styles.stageMobile } : styles.stage}>
  {journeyIntro && (
  <div style={styles.journeyBanner}>
    <p style={styles.journeyLabel}>Your Root Journey</p>

    <h2 style={styles.journeyTitle}>
      {journeyIntro}
    </h2>

    <p style={styles.journeyText}>
      Begin by noticing where your system feels the strongest signal right now.
      Root will guide you forward from there.
    </p>
  </div>
)}
        <div style={styles.bodyPanel}>
          <h1 style={styles.title}>
            {current ? current.label : "Where are you feeling it today?"}
          </h1>

         <div style={isMobile ? { ...styles.bodyImageWrap, ...styles.bodyImageWrapMobile } : styles.bodyImageWrap}>
            <img src="/visuals/body-map-human.png" alt="Root Health body map" style={styles.bodyImage} />

            {bodyZones.map((zone) => (
              <button
                key={zone.id}
                aria-label={zone.id}
                onClick={() => selectSystem(zone.id)}
                style={{ ...styles.hitZone, top: zone.top, left: zone.left, width: zone.width, height: zone.height }}
              />
            ))}

            {current && <div style={styles.activeGlow}>{current.label}</div>}

            {journeyStep === "nervous" && current?.id === "stress_nerves" && (
              <div className="root-mobile-stack" style={styles.nervousCallout}>
                <div style={styles.nervousConnectorLine} />
                <NervousSystemView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "digestion" && current?.id === "digestion" && (
              <div className="root-mobile-stack" style={styles.digestiveCallout}>
                <div style={styles.digestiveConnectorLine} />
                <DigestionView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "heart" && current?.id === "heart_circulation" && (
              <div className="root-mobile-stack" style={styles.heartCallout}>
                <div style={styles.heartConnectorLine} />
                <HeartView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "lungs" && current?.id === "breathing" && (
              <div className="root-mobile-stack" style={styles.lungsCallout}>
                <div style={styles.lungsConnectorLine} />
                <LungsView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "skin" && current?.id === "skin" && (
             <div className="root-mobile-stack" style={styles.skinCallout}>
                <div style={styles.skinConnectorLine} />
                <SkinView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "joints" && current?.id === "muscles_joints" && (
              <div className="root-mobile-stack" style={styles.jointsCallout}>
                <div style={styles.jointsConnectorLine} />
                <JointsView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}

            {journeyStep === "kidneys" && current?.id === "bladder_hydration" && (
              <div className="root-mobile-stack" style={styles.kidneysCallout}>
                <div style={styles.kidneysConnectorLine} />
                <KidneysView selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} context={context} setContext={setContext} intensity={intensity} setIntensity={setIntensity} whatHelped={whatHelped} setWhatHelped={setWhatHelped} saving={saving} onBack={clearSelections} onSave={handleExplore} />
              </div>
            )}
          </div>
{journeyStep === "senses" && current?.id === "senses" && (
  <div className="root-mobile-stack" style={styles.sensesCallout}>
    <div style={styles.sensesConnectorLine} />

    <SensesView
      selectedSignal={selectedSignal}
      setSelectedSignal={setSelectedSignal}
      context={context}
      setContext={setContext}
      intensity={intensity}
      setIntensity={setIntensity}
      whatHelped={whatHelped}
      setWhatHelped={setWhatHelped}
      saving={saving}
      onBack={clearSelections}
      onSave={handleExplore}
    />
  </div>
)}
          {!current && <p style={styles.tapHint}>Tap the area that feels out of balance</p>}

          {current && (
            <button style={styles.clearButton} onClick={clearSelections}>
              Start again
            </button>
          )}
        </div>

        {current &&
          journeyStep !== "nervous" &&
          journeyStep !== "digestion" &&
          journeyStep !== "heart" &&
          journeyStep !== "lungs" &&
          journeyStep !== "skin" &&
          journeyStep !== "joints" &&
          journeyStep !== "kidneys" &&
          journeyStep !== "senses" &&
          current.id !== "stress_nerves" &&
          current.id !== "digestion" &&
          current.id !== "heart_circulation" &&
          current.id !== "breathing" &&
          current.id !== "skin" &&
          current.id !== "muscles_joints" &&
          current.id !== "bladder_hydration" &&
          current.id !== "senses" && (
            <div style={styles.explorePanel}>
              <p style={styles.panelKicker}>Signal exploration</p>
              <h2 style={styles.panelTitle}>{current.label}</h2>

              <p style={styles.question}>What are you noticing?</p>

              <div style={styles.choiceGrid}>
                {current.signals.map((sig) => (
                  <button
                    key={sig}
                    onClick={() => {
                      setSelectedSignal(sig);
                      setContext("");
                      setWhatHelped("");
                      resetLearningUI();
                    }}
                    style={{ ...styles.choiceButton, ...(selectedSignal === sig ? styles.choiceActive : {}) }}
                  >
                    {sig}
                  </button>
                ))}
              </div>

              {selectedSignal && (
                <>
                  <p style={styles.question}>When does this show up?</p>
                  <div style={styles.choiceGrid}>
                    {contextOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setContext(item);
                          resetLearningUI();
                        }}
                        style={{ ...styles.choiceButton, ...(context === item ? styles.choiceActive : {}) }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {context && (
                <>
                  <p style={styles.question}>How strong is it today?</p>
                  <div style={styles.scoreRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setIntensity(score)}
                        style={{ ...styles.scoreButton, ...(intensity === score ? styles.scoreActive : {}) }}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  <p style={styles.question}>What helped, if anything?</p>
                  <div style={styles.choiceGrid}>
                    {helpOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setWhatHelped(opt)}
                        style={{ ...styles.choiceButton, ...(whatHelped === opt ? styles.choiceActive : {}) }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <button style={styles.continueButton} onClick={handleExplore}>
                    {saving ? "Saving..." : "Save & reflect"}
                  </button>
                </>
              )}
            </div>
          )}

               {(response || trendInsight || suggestedHelp || rankedHelp.length > 0) && (
          <div style={styles.responsePanel}>
            <p style={styles.panelKicker}>Root response</p>

            {suggestedHelp && (
              <div style={styles.suggestionCard}>
                Suggested focus: {suggestedHelp}
                {confidenceScore !== null && (
                  <span style={styles.confidenceBadge}>{confidenceScore}%</span>
                )}
              </div>
            )}

            {response && <p style={styles.responseText}>{response}</p>}

            {rankedHelp.length > 0 && (
              <div style={styles.memoryCard}>
                <strong>What tends to help this signal</strong>
                {rankedHelp.map(([item, count], index) => (
                  <p key={item}>
                    {index + 1}. {item} ({count} {count === 1 ? "time" : "times"})
                  </p>
                ))}
              </div>
            )}

            <div style={styles.continueJourney}>
              <p style={styles.continueLabel}>Next step in your Root journey</p>

              <h2 style={styles.continueTitle}>Continue with Root Coach</h2>

              <p style={styles.continueText}>
                Now that we’ve noticed where this is showing up in your body,
                Root Coach can help explore what may be driving the pattern.
              </p>

              <a
                href="/coach"
                style={styles.continuePrimary}
                onClick={() => {
                  const stored = localStorage.getItem("root_journey_v1");
                  const parsed = stored ? JSON.parse(stored) : {};

                  localStorage.setItem(
                    "root_journey_v1",
                    JSON.stringify({
                      ...parsed,
                      currentStage: "coach",
                      completedBody: true,
                      bodyAreas: selectedItems.map((item) => item.label),
                      selectedSignal,
                      intensity,
                    })
                  );
                }}
              >
                Continue to Root Coach →
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  </RootAtmosphere>
);
}

const styles = {  page: {
    minHeight: "100vh",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
    fontFamily: "Inter, sans-serif",
  },

  backgroundWash: {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.08))",
  pointerEvents: "none",
},

  topBar: {
    position: "relative",
    zIndex: 4,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "26px 32px 0",
  },

  iconButton: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.64)",
    color: "#111",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    backdropFilter: "blur(14px)",
  },

 stage: {
  position: "relative",
  zIndex: 2,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 390px",
  gap: "28px",
  minHeight: "calc(100vh - 120px)",
  padding: "20px 20px 124px",
  alignItems: "start",
},
  bodyPanel: {
    position: "relative",
    textAlign: "center",
  },

  title: {
    margin: "0 0 18px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(32px, 6vw, 44px)",
    fontWeight: "500",
    color: "#2A261F",
  },

  bodyImageWrap: {
    position: "relative",
    width: "min(540px, 82vw)",
    margin: "0 auto",
  },

  bodyImage: {
    width: "100%",
    display: "block",
    filter: "drop-shadow(0 32px 70px rgba(0,0,0,0.18))",
  },

  hitZone: {
    position: "absolute",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: "999px",
    zIndex: 4,
  },

  activeGlow: {
    position: "absolute",
    left: "50%",
    bottom: "8%",
    transform: "translateX(-50%)",
    background: "rgba(24,24,24,0.7)",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "10px 16px",
    backdropFilter: "blur(10px)",
    fontSize: "14px",
    zIndex: 6,
  },

 nervousCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "nervousPop 0.38s ease-out",
},

  nervousConnectorLine: {
    position: "absolute",
    left: "-96px",
    top: "86px",
    width: "116px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(255,220,120,0), rgba(255,220,120,0.95))",
    boxShadow: "0 0 18px rgba(255,220,120,0.8)",
    transform: "rotate(-18deg)",
    zIndex: 1,
  },

 digestiveCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "digestivePop 0.38s ease-out",
},

  digestiveConnectorLine: {
    position: "absolute",
    left: "-95px",
    top: "96px",
    width: "110px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(255,210,120,0), rgba(255,210,120,0.95))",
    boxShadow: "0 0 18px rgba(255,210,120,0.8)",
    transform: "rotate(-6deg)",
    zIndex: 1,
  },

 heartCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "heartPop 0.38s ease-out",
},

  heartConnectorLine: {
    position: "absolute",
    left: "-88px",
    top: "92px",
    width: "105px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(255,120,90,0), rgba(255,120,90,0.95))",
    boxShadow: "0 0 18px rgba(255,120,90,0.8)",
    transform: "rotate(-12deg)",
    zIndex: 1,
  },

  lungsCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "lungsPop 0.38s ease-out",
},
  lungsConnectorLine: {
    position: "absolute",
    left: "-88px",
    top: "96px",
    width: "105px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(255,190,90,0), rgba(255,190,90,0.95))",
    boxShadow: "0 0 18px rgba(255,190,90,0.8)",
    transform: "rotate(-8deg)",
    zIndex: 1,
  },

 skinCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "skinPop 0.38s ease-out",
},
  skinConnectorLine: {
    position: "absolute",
    left: "-92px",
    top: "94px",
    width: "108px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(255,210,120,0), rgba(255,210,120,0.95))",
    boxShadow: "0 0 18px rgba(255,210,120,0.8)",
    transform: "rotate(-10deg)",
    zIndex: 1,
  },

 jointsCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "jointsPop 0.38s ease-out",
},

jointsConnectorLine: {
  display: "none",
},
kidneysCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1180px, 94vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "kidneysPop 0.38s ease-out",
},
  kidneysConnectorLine: {
    position: "absolute",
    left: "-92px",
    top: "118px",
    width: "118px",
    height: "2px",
    background: "linear-gradient(90deg, rgba(120,190,255,0), rgba(120,190,255,0.95))",
    boxShadow: "0 0 18px rgba(120,190,255,0.8)",
    transform: "rotate(-4deg)",
    zIndex: 1,
  },
sensesCallout: {
  position: "fixed",
  left: "50%",
  top: "50%",
  width: "min(1220px, 95vw)",
  zIndex: 999,
  transform: "translate(-50%, -50%)",
  animation: "kidneysPop 0.38s ease-out",
},

tapHint: {    marginTop: "-34px",
    color: "#FFFFFF",
    textShadow: "0 2px 14px rgba(0,0,0,0.42)",
    fontSize: "16px",
  },

  clearButton: {
    marginTop: "12px",
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    background: "rgba(255,255,255,0.72)",
    cursor: "pointer",
  },

  explorePanel: {
    maxHeight: "72vh",
    overflowY: "auto",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.74)",
    borderRadius: "34px",
    padding: "28px",
    backdropFilter: "blur(24px)",
    boxShadow: "0 28px 80px rgba(45,38,28,0.2)",
  },

  panelKicker: {
    margin: "0 0 8px",
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#776C5B",
    fontWeight: "800",
  },

  panelTitle: {
    margin: "0 0 20px",
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    color: "#2A261F",
  },

  question: {
    margin: "22px 0 12px",
    color: "#4D463B",
    fontWeight: "700",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: "10px",
  },

  choiceButton: {
    border: "none",
    borderRadius: "16px",
    padding: "13px 14px",
    textAlign: "left",
    background: "rgba(255,255,255,0.76)",
    color: "#2F2A22",
    cursor: "pointer",
    fontSize: "14px",
  },

  choiceActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px",
  },

  scoreButton: {
    height: "38px",
    borderRadius: "999px",
    border: "none",
    background: "rgba(255,255,255,0.76)",
    cursor: "pointer",
  },

  scoreActive: {
    background: "#C23B30",
    color: "#FFFFFF",
  },

  continueButton: {
    width: "100%",
    marginTop: "24px",
    border: "none",
    borderRadius: "18px",
    padding: "16px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  responsePanel: {
    gridColumn: "1 / -1",
    background: "rgba(250,244,234,0.9)",
    borderRadius: "34px",
    padding: "30px",
    backdropFilter: "blur(24px)",
    boxShadow: "0 24px 70px rgba(40,34,25,0.18)",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  responseText: {
    whiteSpace: "pre-line",
    lineHeight: "1.75",
    color: "#2F2A22",
    fontSize: "16px",
  },

  suggestionCard: {
    display: "inline-flex",
    gap: "12px",
    alignItems: "center",
    background: "rgba(48,70,45,0.12)",
    borderRadius: "999px",
    padding: "12px 16px",
    color: "#273C25",
    marginBottom: "12px",
  },

  confidenceBadge: {
    marginLeft: "8px",
    background: "#FFFFFF",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "12px",
  },

  memoryCard: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid rgba(0,0,0,0.1)",
  },
  journeyBanner: {
  gridColumn: "1 / -1",
  maxWidth: "980px",
  margin: "0 auto 18px",
  padding: "28px",
  borderRadius: "32px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(24px)",
  textAlign: "center",
},

journeyLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.82)",
  fontWeight: "800",
},

journeyTitle: {
  margin: "0 0 12px",
  fontFamily: "Georgia, serif",
  fontSize: "34px",
  fontWeight: "500",
  color: "#FFFFFF",
},

journeyText: {
  margin: 0,
  color: "rgba(255,255,255,0.78)",
  lineHeight: "1.8",
  fontSize: "16px",
},

continueJourney: {
  marginTop: "28px",
  paddingTop: "24px",
  borderTop: "1px solid rgba(0,0,0,0.08)",
},

continueLabel: {
  marginBottom: "16px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#776C5B",
  fontWeight: "800",
},

continueGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
},

continueCard: {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textDecoration: "none",
  background: "rgba(255,255,255,0.72)",
  borderRadius: "22px",
  padding: "18px",
  color: "#2A261F",
},
  continueTitle: {
  margin: "0 0 10px",
  fontFamily: "Georgia, serif",
  fontSize: "28px",
  fontWeight: "500",
  color: "#2A261F",
},

continueText: {
  margin: "0 0 18px",
  color: "#4D463B",
  lineHeight: "1.7",
},

continuePrimary: {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  textDecoration: "none",
  background: "#181818",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "14px 20px",
  fontSize: "14px",
  fontWeight: "700",
},
  stageMobile: {
  display: "flex",
  flexDirection: "column",
  padding: "18px 16px 90px",
  gap: "22px",
  minHeight: "auto",
  alignItems: "stretch",
},

bodyImageWrapMobile: {
  width: "min(360px, 88vw)",
},

pageMobile: {
  overflowX: "hidden",
  overflowY: "auto",
},
  };
