/*
 * ROOT DICTATION
 *
 * Shared browser audio recorder for places where
 * a user wants to dictate text into Root.
 *
 * IMPORTANT:
 * This is NOT Root Voice Coach.
 * This is NOT HR Coach.
 *
 * It simply:
 *
 * microphone
 *   ↓
 * record until the USER stops
 *   ↓
 * send audio to /api/transcribe
 *   ↓
 * receive text
 *
 * There is no silence timeout and no browser
 * SpeechRecognition dependency.
 */

function getSupportedMimeType() {
  if (
    typeof window === "undefined" ||
    typeof MediaRecorder === "undefined"
  ) {
    return "";
  }

  const preferredTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return (
    preferredTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) || ""
  );
}

function getExtension(mimeType = "") {
  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  return "webm";
}

export function createRootDictation() {
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];

  let recordingStartedAt = null;

  function isSupported() {
    return Boolean(
      typeof navigator !== "undefined" &&
        navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );
  }

  function isRecording() {
    return (
      mediaRecorder?.state === "recording"
    );
  }

  function getRecordingSeconds() {
    if (!recordingStartedAt) {
      return 0;
    }

    return Math.floor(
      (Date.now() - recordingStartedAt) /
        1000
    );
  }

  async function start() {
    if (!isSupported()) {
      throw new Error(
        "Audio recording is not supported in this browser."
      );
    }

    if (isRecording()) {
      return;
    }

    chunks = [];

    mediaStream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    const mimeType =
      getSupportedMimeType();

    mediaRecorder = mimeType
      ? new MediaRecorder(
          mediaStream,
          {
            mimeType,
          }
        )
      : new MediaRecorder(
          mediaStream
        );

    recordingStartedAt = Date.now();

    mediaRecorder.ondataavailable = (
      event
    ) => {
      if (
        event.data &&
        event.data.size > 0
      ) {
        chunks.push(event.data);
      }
    };

    /*
     * Ask the browser to give us a chunk every
     * second rather than holding the entire
     * recording internally until Stop is pressed.
     *
     * This is better suited to longer reflections.
     */
    mediaRecorder.start(1000);
  }

  async function stop() {
    if (!mediaRecorder) {
      throw new Error(
        "Root is not currently recording."
      );
    }

    if (
      mediaRecorder.state === "inactive"
    ) {
      throw new Error(
        "Root has already stopped recording."
      );
    }

    const recorder = mediaRecorder;
    const stream = mediaStream;

    return new Promise(
      (resolve, reject) => {
        recorder.onerror = (event) => {
          cleanupStream(stream);

          reject(
            new Error(
              event?.error?.message ||
                "The recording could not be completed."
            )
          );
        };

        recorder.onstop = () => {
          try {
            const mimeType =
              recorder.mimeType ||
              "audio/webm";

            const blob = new Blob(
              chunks,
              {
                type: mimeType,
              }
            );

            const extension =
              getExtension(mimeType);

            const file = new File(
              [blob],
              `root-dictation-${Date.now()}.${extension}`,
              {
                type: mimeType,
              }
            );

            cleanupStream(stream);

            mediaRecorder = null;
            mediaStream = null;
            chunks = [];
            recordingStartedAt = null;

            resolve(file);
          } catch (error) {
            cleanupStream(stream);

            reject(error);
          }
        };

        recorder.stop();
      }
    );
  }

  function cancel() {
    try {
      if (
        mediaRecorder &&
        mediaRecorder.state !==
          "inactive"
      ) {
        mediaRecorder.stop();
      }
    } catch (error) {
      console.log(
        "Root dictation cancel:",
        error
      );
    }

    cleanupStream(mediaStream);

    mediaRecorder = null;
    mediaStream = null;
    chunks = [];
    recordingStartedAt = null;
  }

  return {
    isSupported,
    isRecording,
    getRecordingSeconds,
    start,
    stop,
    cancel,
  };
}

function cleanupStream(stream) {
  if (!stream) return;

  stream
    .getTracks()
    .forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        console.log(
          "Could not stop audio track:",
          error
        );
      }
    });
}

export async function transcribeRootAudio(
  audioFile
) {
  if (!audioFile) {
    throw new Error(
      "There is no recording to transcribe."
    );
  }

  if (!audioFile.size) {
    throw new Error(
      "The recording was empty."
    );
  }

  const formData = new FormData();

  formData.append(
    "audio",
    audioFile,
    audioFile.name ||
      "root-dictation.webm"
  );

  const response = await fetch(
    "/api/transcribe",
    {
      method: "POST",
      body: formData,
    }
  );

  let result = null;

  try {
    result =
      await response.json();
  } catch (error) {
    throw new Error(
      "Root could not read the transcription response."
    );
  }

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ||
        "Root could not transcribe that recording."
    );
  }

  const transcript = String(
    result.text || ""
  ).trim();

  if (!transcript) {
    throw new Error(
      "Root could not hear enough speech to create a transcript."
    );
  }

  return transcript;
}
