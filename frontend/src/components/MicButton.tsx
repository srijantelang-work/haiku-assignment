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
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
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

export default function MicButton({ onTranscript, disabled }: MicButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handleRef = useRef<RecordingHandle | null>(null);
  const wantStopRef = useRef(false);

  if (!voiceSupported) return null;

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const deliver = async (clip: { wav: Blob; duration: number; loud: boolean }) => {
    setPhase("transcribing");
    try {
      if (clip.duration < 0.25) {
        // Accidental tap or instant release: reset to idle cleanly
        setPhase("idle");
        setError(null);
        return;
      }
      if (clip.duration < MIN_DURATION) {
        setPhase("error");
        setError("That clip was too short — hold the mic and speak a little longer.");
        return;
      }
      if (!clip.loud) {
        setPhase("error");
        setError("Didn't hear anything — try again a bit louder.");
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
      setError("Microphone unavailable. Allow mic access in your browser, then try again.");
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

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    void start();
  };

  const onPointerUp = () => stop();

  return (
    <div className="mic">
      <button
        type="button"
        className={
          "mic-button" +
          (phase === "listening" ? " listening" : "") +
          (phase === "transcribing" ? " transcribing" : "")
        }
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Record your answer"
        title="Hold to talk"
      >
        {phase === "transcribing" ? <span className="mic-spinner" /> : <MicIcon />}
      </button>
      <span className={"mic-status" + (phase === "error" ? " error" : "")}>
        {phase === "idle" && "Hold to talk"}
        {phase === "listening" && "Listening… release to send"}
        {phase === "transcribing" && "Transcribing…"}
        {phase === "error" && (error ?? "Try again")}
      </span>
    </div>
  );
}
