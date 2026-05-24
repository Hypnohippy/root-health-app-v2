export function buildProactiveCare({
  longitudinalMemory = null,
  relationalMemory = null,
}) {
  if (!longitudinalMemory) {
    return {
      title: "Root will guide you gently as patterns appear.",
      message:
        "As you add more check-ins, Root can begin suggesting the right support before things become too loud.",
      action: {
        href: "/body",
        label: "Start a gentle check-in",
      },
    };
  }

  if (longitudinalMemory.trajectory === "intensifying") {
    return {
      title: "This may be a good moment to reduce pressure.",
      message:
        "Your recent signals seem stronger than before. Root can guide a quieter recovery path before the system becomes more overloaded.",
      action: {
        href: "/coach",
        label: "Start recovery support",
      },
    };
  }

  if (longitudinalMemory.nervousSystemLoad === "high") {
    return {
      title: "Your system may need recovery before more effort.",
      message:
        "Root is noticing sustained load. A slower, simpler support session may be more useful than pushing through.",
      action: {
        href: "/coach",
        label: "Settle with Root Coach",
      },
    };
  }

  if (longitudinalMemory.trajectory === "softening") {
    return {
      title: "Something may be helping.",
      message:
        "Your recent signals may be softening. This could be a good time to notice what supported you and repeat it gently.",
      action: {
        href: "/journal",
        label: "Reflect on what helped",
      },
    };
  }

  if (relationalMemory?.memories?.some((item) => item.toLowerCase().includes("sleep"))) {
    return {
      title: "Recovery may be worth protecting today.",
      message:
        "Sleep and recovery seem important in your pattern. Root can help you prepare a softer evening before the day spills into the night.",
      action: {
        href: "/coach",
        label: "Prepare a wind-down",
      },
    };
  }

  return {
    title: "Keep the next step small.",
    message:
      "Root is beginning to understand your rhythm. A simple check-in today may help keep the pattern visible before it grows louder.",
    action: {
      href: "/body",
      label: "Continue check-in",
    },
  };
}
