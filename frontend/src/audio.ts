export const MIN_DURATION = 0.4;
const LOUDNESS_THRESHOLD = 0.01;
const BUFFER_SIZE = 4096;

export interface RecordingHandle {
  stop: () => RecordedClip;
}

export interface RecordedClip {
  wav: Blob;
  duration: number;
  loud: boolean;
}

export function startCapture(stream: MediaStream): RecordingHandle {
  const ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();

  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
  const chunks: Float32Array[] = [];

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };

  source.connect(processor);
  processor.connect(ctx.destination);

  const stop = (): RecordedClip => {
    processor.disconnect();
    source.disconnect();
    void ctx.close().catch(() => {});

    const totalLength = chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = ctx.sampleRate;
    const duration = totalLength / sampleRate;

    let sumSq = 0;
    for (let i = 0; i < totalLength; i++) {
      sumSq += samples[i] * samples[i];
    }
    const loud = totalLength > 0 && Math.sqrt(sumSq / totalLength) > LOUDNESS_THRESHOLD;
    const wav = encodeWav(samples, sampleRate);

    return { wav, duration, loud };
  };

  return { stop };
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const length = samples.length;
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < length; i++) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buf], { type: "audio/wav" });
}
