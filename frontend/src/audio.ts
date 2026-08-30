// Re-encode browser-recorded audio as a clean 16-bit PCM WAV before upload.
//
// The browser's MediaRecorder emits WebM/Opus (Chrome), Ogg (Firefox), or
// MP4/AAC (Safari). Those containers are fine for playback, but strict STT
// services (ElevenLabs Scribe included) sometimes reject Chrome's WebM/Opus as
// "corrupted / not playable". Decoding with the Web Audio API and re-encoding
// to mono PCM WAV sidesteps that entirely — WAV is accepted everywhere.

export const MIN_DURATION = 0.4; // seconds — reject near-instant taps
const LOUDNESS_THRESHOLD = 0.01; // RMS below this counts as silence

export interface DecodedClip {
  wav: Blob;
  duration: number;
  loud: boolean;
}

/** Decode a recorded blob and re-encode it as mono 16-bit PCM WAV. */
export async function toWav(blob: Blob): Promise<DecodedClip> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const { wav, loud } = encodeWav(buffer);
    return { wav, duration: buffer.duration, loud };
  } finally {
    void ctx.close().catch(() => {});
  }
}

function encodeWav(buffer: AudioBuffer): { wav: Blob; loud: boolean } {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  const length = buffer.length;
  const pcm = new Int16Array(length);
  let sumSq = 0;
  for (let i = 0; i < length; i++) {
    let s = 0;
    for (let c = 0; c < channels.length; c++) s += channels[c][i];
    s /= channels.length;
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    sumSq += s * s;
  }
  const loud = Math.sqrt(sumSq / length) > LOUDNESS_THRESHOLD;

  const sampleRate = buffer.sampleRate;
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < length; i++) view.setInt16(44 + i * 2, pcm[i], true);

  return { wav: new Blob([buf], { type: "audio/wav" }), loud };
}
