import { useRef, useState } from "react";
import { transcribe } from "../api";
import { MIN_DURATION, startCapture } from "../audio";
import type { RecordingHandle } from "../audio";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type Phase = "idle" | "listening" | "transcribing" | "error";

export const voiceSupported =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof AudioContext !== "undefined";

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
      />
      <path
        fill="currentColor"
        d="M18 11a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.94V21h2v-2.06A8 8 0 0 0 20 11h-2Z"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export default function MicButton({ onTranscript, disabled }: MicButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handleRef = useRef<RecordingHandle | null>(null);
  const wantStopRef = useRef(false);
  const pointerStartTimeRef = useRef<number>(0);

  if (!voiceSupported) return null;

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const deliver = async (clip: { wav: Blob; duration: number; loud: boolean }) => {
    setPhase("transcribing");
    try {
      if (clip.duration < 0.25) {
        // Accidental instant tap
        setPhase("idle");
        setError(null);
        return;
      }
      if (clip.duration < MIN_DURATION) {
        setPhase("error");
        setError("Hold or tap, then speak a little longer.");
        return;
      }
      if (!clip.loud) {
        setPhase("error");
        setError("Didn't catch that — please speak a bit louder.");
        return;
      }
      const text = await transcribe(clip.wav);
      setPhase("idle");
      setError(null);
      onTranscript(text);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Transcription failed.");
    }
  };

  const start = async () => {
    if (disabled || phase === "listening" || phase === "transcribing") return;
    setError(null);
    wantStopRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      handleRef.current = startCapture(stream);
      setPhase("listening");
      if (wantStopRef.current) stop();
    } catch {
      setPhase("error");
      setError("Microphone access denied. Enable it in browser settings.");
    }
  };

  const stop = () => {
    const handle = handleRef.current;
    if (handle) {
      handleRef.current = null;
      const clip = handle.stop();
      cleanupStream();
      void deliver(clip);
    } else {
      wantStopRef.current = true;
    }
  };

  // Support both tap-to-toggle and hold-to-talk
  const handlePointerDown = () => {
    pointerStartTimeRef.current = Date.now();
    if (phase === "idle" || phase === "error") {
      void start();
    } else if (phase === "listening") {
      stop();
    }
  };

  const handlePointerUp = () => {
    const pressDuration = Date.now() - pointerStartTimeRef.current;
    // If user held down for more than 400ms, treat as hold-to-talk release
    if (pressDuration > 400 && phase === "listening") {
      stop();
    }
  };

  return (
    <div className="mic-wrapper">
      <button
        type="button"
        className={
          "mic-button" +
          (phase === "listening" ? " listening" : "") +
          (phase === "transcribing" ? " transcribing" : "")
        }
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-label="Voice Answer"
        title="Tap or hold to speak your answer"
      >
        {phase === "transcribing" ? (
          <span className="mic-spinner" />
        ) : phase === "listening" ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>

      <div className="mic-info">
        <div className="mic-status-row">
          {phase === "listening" && (
            <div className="mic-waveform" aria-hidden="true">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          )}
          <span className={"mic-status" + (phase === "error" ? " error" : "")}>
            {phase === "idle" && "Tap or hold to speak"}
            {phase === "listening" && "Listening… tap to finish"}
            {phase === "transcribing" && "Understanding your answer…"}
            {phase === "error" && (error ?? "Try speaking again")}
          </span>
        </div>
      </div>
    </div>
  );
}
