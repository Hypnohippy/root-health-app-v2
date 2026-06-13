"use client";

import { useState } from "react";

export default function AudioTestPage() {
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState("");
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [title, setTitle] = useState("safe-place-visualisation");
  const [script, setScript] = useState(`Close your eyes if comfortable.

Take a slow breath in.

And slowly breathe out.

Imagine a place where you feel safe, calm, and supported.

Allow that image to become clearer.

Notice what you can see.

Notice what you can hear.

Notice how your body begins to soften.`);

  const generateAudio = async () => {
    setLoading(true);
    setAudioFile("");

    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        text: script,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      setAudioFile(data.file);

      setGeneratedFiles((current) => [
        {
          title,
          file: data.file,
        },
        ...current,
      ]);
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
          boxSizing: "border-box",
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
          boxSizing: "border-box",
        }}
      />

      <button onClick={generateAudio} disabled={loading}>
        {loading ? "Generating..." : "Generate Audio"}
      </button>

      {audioFile && (
        <>
          <p>{audioFile}</p>
          <audio controls src={audioFile} />
        </>
      )}

      {generatedFiles.length > 0 && (
        <section style={{ marginTop: "30px" }}>
          <h2>Generated audio files</h2>

          {generatedFiles.map((item, index) => (
            <div
              key={`${item.file}-${index}`}
              style={{
                marginBottom: "20px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <strong>{item.title}</strong>
              <p style={{ wordBreak: "break-all" }}>{item.file}</p>
              <audio controls src={item.file} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
