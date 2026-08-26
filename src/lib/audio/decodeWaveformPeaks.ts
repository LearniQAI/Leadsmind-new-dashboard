// Client-only: decodes a real audio file/URL via the Web Audio API and reduces it to a
// fixed number of peak-amplitude bars (0-100), for a genuine waveform preview rather than
// a decorative placeholder. Used by the admin audio block editor; the resulting bars are
// persisted on the block so the student player doesn't need to re-decode the file.
export async function decodeWaveformPeaks(source: File | string, barCount = 40): Promise<number[]> {
  const arrayBuffer = typeof source === 'string'
    ? await (await fetch(source)).arrayBuffer()
    : await source.arrayBuffer();

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / barCount));

    const peaks: number[] = [];
    for (let bar = 0; bar < barCount; bar++) {
      const start = bar * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channelData.length);
      let peak = 0;
      for (let i = start; i < end; i++) {
        const abs = Math.abs(channelData[i]);
        if (abs > peak) peak = abs;
      }
      peaks.push(peak);
    }

    const maxPeak = Math.max(...peaks, 0.0001);
    // Scale to 12-100 (matching VoiceNotePlayer's decorative range) so silence isn't invisible.
    return peaks.map((p) => Math.round(12 + (p / maxPeak) * 88));
  } finally {
    audioContext.close();
  }
}
