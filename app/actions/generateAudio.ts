'use server';

import Groq from 'groq-sdk';

// Collect all GROQ API keys for round-robin rotation
const groqApiKeys = [
  process.env.GROQ_API_KEY,
  ...Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]),
].filter(Boolean) as string[];

let keyIndex = 0;
function getGroqClient(): Groq {
  const key = groqApiKeys[keyIndex % groqApiKeys.length];
  keyIndex++;
  return new Groq({ apiKey: key });
}

const TTS_MODEL = 'canopylabs/orpheus-v1-english';
const MAX_CHARS = 200; // Groq Orpheus limit

// Voice pairs for two-speaker dialogues (male + female for contrast)
const VOICE_PAIRS: [string, string][] = [
  ['austin', 'diana'],
  ['daniel', 'hannah'],
  ['troy', 'autumn'],
];

// Single-speaker narration voices
const NARRATOR_VOICES = ['diana', 'austin', 'hannah', 'daniel', 'autumn', 'troy'];

interface SpeakerSegment {
  speaker: string;
  text: string;
}

interface BatchedSegment {
  speaker: string;
  text: string;
}

/**
 * Parse text into speaker segments
 */
function parseDialogue(text: string): SpeakerSegment[] {
  const lines = text.split('\n').filter(l => l.trim());
  const segments: SpeakerSegment[] = [];
  const speakerPattern = /^([A-Za-z][A-Za-z0-9 .''-]{0,30})\s*:\s+(.+)/;

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      segments.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else if (line.trim()) {
      segments.push({ speaker: '__narrator__', text: line.trim() });
    }
  }
  return segments;
}

/**
 * Batch consecutive segments by the same speaker to reduce API calls
 */
function batchSegments(segments: SpeakerSegment[]): BatchedSegment[] {
  const batched: BatchedSegment[] = [];
  for (const seg of segments) {
    const last = batched[batched.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.text += ' ' + seg.text;
    } else {
      batched.push({ speaker: seg.speaker, text: seg.text });
    }
  }
  return batched;
}

function isDialogue(text: string): boolean {
  const segments = parseDialogue(text);
  const speakers = new Set(segments.map(s => s.speaker).filter(s => s !== '__narrator__'));
  return speakers.size >= 2;
}

/**
 * Split text into chunks of ≤ MAX_CHARS at sentence boundaries
 */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];

  const chunks: string[] = [];
  // Split by sentence-ending punctuation, keeping the punctuation
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

  let current = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 1 <= MAX_CHARS) {
      current = current ? current + ' ' + trimmed : trimmed;
    } else {
      if (current) chunks.push(current);
      // If a single sentence exceeds MAX_CHARS, split by words
      if (trimmed.length > MAX_CHARS) {
        const words = trimmed.split(/\s+/);
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length + 1 <= MAX_CHARS) {
            wordChunk = wordChunk ? wordChunk + ' ' + word : word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        if (wordChunk) current = wordChunk;
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [text.substring(0, MAX_CHARS)];
}

/**
 * Generate WAV audio for a single text chunk using Groq TTS
 */
async function generateChunkAudio(
  text: string,
  voice: string,
  retries: number = 2,
): Promise<Buffer> {
  const maxAttempts = Math.min(retries + 1, groqApiKeys.length);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const client = getGroqClient();
      const response = await client.audio.speech.create({
        model: TTS_MODEL,
        voice: voice,
        input: text,
        response_format: 'wav',
      });

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate');
      if (attempt < maxAttempts - 1) {
        // If it's a rate limit, don't wait long — just try the next API key immediately
        const delay = isRateLimit ? 250 : 1000 * (attempt + 1);
        if (isRateLimit) {
          console.warn(`Chunk TTS attempt ${attempt + 1} hit rate limit (${voice}), switching to next API key...`);
        } else {
          console.warn(`Chunk TTS attempt ${attempt + 1} failed (${voice}), retrying in ${delay}ms...`);
        }
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('All TTS generation attempts failed (quota exhausted)');
}

/**
 * Extract PCM data from a WAV buffer (skip the 44-byte header)
 */
function wavToPcm(wavBuffer: Buffer): { pcm: Buffer; sampleRate: number } {
  // Parse WAV header
  const sampleRate = wavBuffer.readUInt32LE(24);
  // Find 'data' chunk
  let dataOffset = 12;
  while (dataOffset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') {
      return { pcm: wavBuffer.subarray(dataOffset + 8, dataOffset + 8 + chunkSize), sampleRate };
    }
    dataOffset += 8 + chunkSize;
  }
  // Fallback: assume standard 44-byte header
  return { pcm: wavBuffer.subarray(44), sampleRate };
}

/**
 * Create a WAV buffer from raw PCM data
 */
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate: number = 48000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Combine multiple WAV buffers with silence gaps between them
 */
function combineWavBuffers(wavBuffers: Buffer[], gapSeconds: number = 0.4): Buffer {
  if (wavBuffers.length === 0) throw new Error('No audio buffers');
  if (wavBuffers.length === 1) return wavBuffers[0];

  const pcmParts: Buffer[] = [];
  let sampleRate = 48000;

  for (let i = 0; i < wavBuffers.length; i++) {
    const { pcm, sampleRate: sr } = wavToPcm(wavBuffers[i]);
    sampleRate = sr;
    pcmParts.push(pcm);
    if (i < wavBuffers.length - 1) {
      // Add silence gap
      const silenceSamples = Math.floor(sampleRate * gapSeconds);
      pcmParts.push(Buffer.alloc(silenceSamples * 2)); // 16-bit = 2 bytes/sample
    }
  }

  return pcmToWavBuffer(Buffer.concat(pcmParts), sampleRate);
}

/**
 * Generate audio for a text that may exceed MAX_CHARS by chunking + concatenating
 */
async function generateVoiceAudio(text: string, voice: string): Promise<Buffer> {
  const chunks = chunkText(text);

  if (chunks.length === 1) {
    return generateChunkAudio(chunks[0], voice, groqApiKeys.length);
  }

  console.log(`  Chunked into ${chunks.length} pieces for voice ${voice}`);
  const wavBuffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const wav = await generateChunkAudio(chunks[i], voice, groqApiKeys.length);
    wavBuffers.push(wav);
    // Small delay between chunks to avoid per-key rate limits
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return combineWavBuffers(wavBuffers, 0.15); // Shorter gap within same speaker
}

export async function generateAudioAction(text: string, index: number = 0) {
  if (!text) return { success: false, error: 'No text provided' };
  if (groqApiKeys.length === 0) return { success: false, error: 'Missing Groq API Key' };

  try {
    if (isDialogue(text)) {
      const segments = parseDialogue(text);
      const batched = batchSegments(segments);
      const speakers = [...new Set(segments.map(s => s.speaker).filter(s => s !== '__narrator__'))];
      const voicePair = VOICE_PAIRS[index % VOICE_PAIRS.length];

      // Map speakers to voices
      const voiceMap: Record<string, string> = {};
      speakers.forEach((speaker, i) => {
        voiceMap[speaker] = voicePair[i % voicePair.length];
      });
      voiceMap['__narrator__'] = NARRATOR_VOICES[(index + 2) % NARRATOR_VOICES.length];

      console.log(`Multi-speaker (Groq): ${batched.length} segments, ${speakers.length} speakers`);
      console.log(`Voice map: ${JSON.stringify(voiceMap)}`);

      const wavBuffers: Buffer[] = [];
      let consecutiveFailures = 0;

      for (let i = 0; i < batched.length; i++) {
        const seg = batched[i];
        const voice = voiceMap[seg.speaker] || voicePair[0];

        try {
          const wav = await generateVoiceAudio(seg.text, voice);
          wavBuffers.push(wav);
          consecutiveFailures = 0;
          console.log(`  ✓ Segment ${i + 1}/${batched.length} (${voice})`);
        } catch (err: any) {
          consecutiveFailures++;
          console.warn(`  ✗ Segment ${i + 1}/${batched.length} failed (${voice}): ${err.message?.substring(0, 100)}`);
          if (consecutiveFailures >= 3) {
            console.error('Too many consecutive failures, aborting multi-speaker');
            break;
          }
        }

        // Delay between segments
        if (i < batched.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // ALL segments must succeed for multi-speaker
      if (wavBuffers.length === batched.length) {
        const combinedWav = combineWavBuffers(wavBuffers, 0.4);
        const audioUrl = `data:audio/wav;base64,${combinedWav.toString('base64')}`;
        console.log(`✅ Multi-speaker complete: ${wavBuffers.length}/${batched.length} segments, ~${Math.round(combinedWav.length / 1024)}KB`);
        return { success: true, audioUrl };
      }

      // Fallback: single-voice for complete audio
      console.warn(`⚠️ Multi-speaker incomplete (${wavBuffers.length}/${batched.length}). Using single-voice fallback...`);
      const plainText = segments.map(s => s.text).join('. ');
      try {
        const voice = NARRATOR_VOICES[index % NARRATOR_VOICES.length];
        console.log(`Single-voice fallback with voice ${voice}...`);
        const wav = await generateVoiceAudio(plainText, voice);
        const audioUrl = `data:audio/wav;base64,${wav.toString('base64')}`;
        console.log(`✅ Single-voice fallback complete: ~${Math.round(wav.length / 1024)}KB`);
        return { success: true, audioUrl };
      } catch (fallbackErr: any) {
        console.error(`Single-voice fallback failed: ${fallbackErr.message?.substring(0, 100)}`);
        return { success: false, error: 'Audio generation failed after retries' };
      }

    } else {
      // Single speaker
      const voice = NARRATOR_VOICES[index % NARRATOR_VOICES.length];
      console.log(`Single-speaker (Groq, voice: ${voice}) for part ${index + 1}...`);

      try {
        const wav = await generateVoiceAudio(text, voice);
        const audioUrl = `data:audio/wav;base64,${wav.toString('base64')}`;
        console.log(`✅ Audio generated: ~${Math.round(wav.length / 1024)}KB`);
        return { success: true, audioUrl };
      } catch (err: any) {
        console.error(`Single-speaker failed: ${err.message?.substring(0, 100)}`);
        return { success: false, error: `Audio generation failed: ${err.message}` };
      }
    }

  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error('Groq TTS failed:', msg.substring(0, 200));
    return { success: false, error: `Failed to generate audio: ${msg}` };
  }
}
