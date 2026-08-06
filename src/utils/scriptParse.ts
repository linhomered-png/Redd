/**
 * Splits a raw transcript into caption-length "sentences" and, within a sentence,
 * into word-by-word "reveal units" used to animate captions in sync with narration.
 */

const SENTENCE_END = /(?<=[。！？!?])\s*/;
const COMMA_BREAK = /(?<=[，,])\s*/;

/** Roughly how many characters a single caption line/sentence should hold before we
 * look for a comma to break on, so long run-on sentences don't overflow the screen. */
const MAX_CAPTION_CHARS = 28;

/** Splits raw text into sentences using line breaks and CJK/Latin sentence punctuation. */
function splitOnPunctuation(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  return normalized
    .split(/\n+/)
    .flatMap((line) => line.split(SENTENCE_END))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Splits a transcript into caption-sized sentences: first by sentence-ending
 * punctuation (。！？), then any sentence still longer than MAX_CAPTION_CHARS is
 * further broken at commas so no single caption line runs on too long.
 */
export function splitIntoCaptionSentences(raw: string): string[] {
  const rough = splitOnPunctuation(raw);
  const result: string[] = [];
  for (const sentence of rough) {
    if (sentence.length <= MAX_CAPTION_CHARS) {
      result.push(sentence);
      continue;
    }
    const parts = sentence.split(COMMA_BREAK).filter(Boolean);
    let buffer = "";
    for (const part of parts) {
      if (buffer && (buffer + part).length > MAX_CAPTION_CHARS) {
        result.push(buffer);
        buffer = part;
      } else {
        buffer += part;
      }
    }
    if (buffer) result.push(buffer);
  }
  return result;
}

const CJK_CHAR =
  /[㐀-鿿豈-﫿぀-ヿ가-힣]/;
const PUNCTUATION =
  /[，。！？：；、""''（）《》【】…—.,!?;:()[\]]/;

/**
 * Splits a sentence into "reveal units" for word-by-word caption animation: each
 * CJK character becomes its own unit (trailing punctuation attaches to it), while
 * runs of Latin letters/digits stay together as a single unit.
 */
export function splitIntoRevealUnits(sentence: string): string[] {
  const units: string[] = [];
  let buffer = "";

  const flushBuffer = () => {
    if (buffer) {
      units.push(buffer);
      buffer = "";
    }
  };

  for (const ch of sentence) {
    if (/\s/.test(ch)) {
      flushBuffer();
      continue;
    }
    if (PUNCTUATION.test(ch)) {
      if (units.length > 0) {
        units[units.length - 1] += ch;
      } else {
        buffer += ch;
      }
      continue;
    }
    if (CJK_CHAR.test(ch)) {
      flushBuffer();
      units.push(ch);
      continue;
    }
    buffer += ch;
  }
  flushBuffer();
  return units;
}
