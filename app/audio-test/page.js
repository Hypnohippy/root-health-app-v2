"use client";

import { useState } from "react";

export default function AudioTestPage() {
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState("");
  const [title, setTitle] = useState("safe-place-test");

const [script, setScript] = useState(`
Close your eyes if comfortable.

Take a slow breath in.

And slowly breathe out.

Imagine a place where you feel safe, calm, and supported.
`);

  const generateAudio = async () => {
    setLoading(true);

    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
     body: JSON.stringify({
  title,
  text: script,
}),`
Close your eyes if comfortable.

Take a slow breath in.

And slowly breathe out.

Imagine a place where you feel safe, calm, and supported.

Allow that image to become clearer.

Notice what you can see.

Notice what you can hear.

Notice how your body begins to soften.
        `,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      setAudioFile(data.file);
    } else {
      alert(data.error || "Audio generation failed.");
    }

    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#111",
        color: "#fff",
      }}
    >
      <h1>Root Audio Test</h1>

      <input
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="Audio title"
  style={{
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
  }}
/>

<textarea
  value={script}
  onChange={(e) => setScript(e.target.value)}
  placeholder="Audio script"
  style={{
    width: "100%",
    minHeight: "300px",
    padding: "12px",
    marginBottom: "12px",
  }}
/>
      <button onClick={generateAudio}>
        {loading ? "Generating..." : "Generate Audio"}
      </button>

      {audioFile && (
        <>
          <p>{audioFile}</p>

          <audio controls src={audioFile} />
        </>
      )}
    </main>
  );
}
