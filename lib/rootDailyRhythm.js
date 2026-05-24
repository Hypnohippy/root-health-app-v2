function hourOf(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours();
}

function average(values) {
  if (!values.length) return null;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

export function buildDailyRhythm({
  bodySignals = [],
}) {
  const buckets = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  bodySignals.forEach((entry) => {
    const hour = hourOf(entry.created_at);

    if (hour === null) return;

    const intensity = Number(entry.intensity || 0);

    if (hour >= 5 && hour < 12) {
      buckets.morning.push(intensity);
    } else if (hour >= 12 && hour < 17) {
      buckets.afternoon.push(intensity);
    } else if (hour >= 17 && hour < 22) {
      buckets.evening.push(intensity);
    } else {
      buckets.night.push(intensity);
    }
  });

  const averages = {
    morning: average(buckets.morning),
    afternoon: average(buckets.afternoon),
    evening: average(buckets.evening),
    night: average(buckets.night),
  };

  const strongest = Object.entries(averages)
    .filter(([, value]) => value !== null)
    .sort((a, b) => b[1] - a[1])[0];

  let headline =
    "Root is beginning to understand your daily rhythm.";

  let reflection =
    "As more check-ins build up, Root can begin noticing when your system tends to tighten or soften through the day.";

  if (strongest) {
    const [period] = strongest;

    if (period === "morning") {
      headline =
        "Your nervous system may feel heavier earlier in the day.";

      reflection =
        "Morning signals appear stronger recently. A slower start and gentler pacing early in the day may help.";
    }

    if (period === "afternoon") {
      headline =
        "Pressure may build through the middle of the day.";

      reflection =
        "Root is noticing stronger afternoon signals. Small pauses before overload builds may help regulate the system.";
    }

    if (period === "evening") {
      headline =
        "Your nervous system may carry more load later in the day.";

      reflection =
        "Evening signals appear stronger recently. Recovery and decompression before night may be especially important.";
    }

    if (period === "night") {
      headline =
        "Late-night nervous system activity may be affecting recovery.";

      reflection =
        "Root is noticing stronger night-time signals. Rest, slowing stimulation, and nervous system settling may help.";
    }
  }

  return {
    strongestPeriod: strongest?.[0] || null,
    headline,
    reflection,
    averages,
  };
}
