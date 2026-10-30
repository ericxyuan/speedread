const TONE_MAP: Record<string, string> = {
  ā: "a",
  á: "a",
  ǎ: "a",
  à: "a",
  ē: "e",
  é: "e",
  ě: "e",
  è: "e",
  ī: "i",
  í: "i",
  ǐ: "i",
  ì: "i",
  ō: "o",
  ó: "o",
  ǒ: "o",
  ò: "o",
  ū: "u",
  ú: "u",
  ǔ: "u",
  ù: "u",
  ǖ: "ü",
  ǘ: "ü",
  ǚ: "ü",
  ǜ: "ü",
};

const SYLLABLE =
  /^(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:iang|iong|uang|ueng|üan|iao|ian|uai|uan|üe|ue|ai|ei|ui|ao|ou|iu|ie|er|an|en|in|un|ün|ang|eng|ing|ong|ia|ua|uo|a|o|e|ê|i|u|ü)$/u;
const INITIAL = /^(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/u;

function normalize(syllable: string) {
  const chars: string[] = [];
  let marked = -1;
  for (const char of Array.from(syllable.toLowerCase())) {
    if (char === "v") {
      chars.push("ü");
      continue;
    }
    const base = TONE_MAP[char];
    if (base) {
      if (marked >= 0) return null;
      marked = chars.length;
      chars.push(base);
    } else {
      chars.push(char);
    }
  }
  return { base: chars.join(""), marked, chars };
}

function tonePlacementIsValid(chars: string[], marked: number) {
  if (marked < 0) return true;
  const a = chars.indexOf("a");
  const o = chars.indexOf("o");
  const e = chars.indexOf("e");
  let expected: number;
  if (a >= 0) expected = a;
  else if (o >= 0) expected = o;
  else if (e >= 0) expected = e;
  else {
    const iu = chars.findIndex(
      (char, index) => char === "i" && chars[index + 1] === "u",
    );
    const ui = chars.findIndex(
      (char, index) => char === "u" && chars[index + 1] === "i",
    );
    const vowels = chars.flatMap((char, index) =>
      /[iuü]/u.test(char) ? [index] : [],
    );
    if (iu >= 0) expected = iu + 1;
    else if (ui >= 0) expected = ui + 1;
    else if (vowels.length === 1) expected = vowels[0];
    else return false;
  }
  return marked === expected;
}

/** Accept a real Mandarin syllable, with tone marks on the correct vowel.
 * `v` is accepted as a typed form of `ü`; neutral tones are valid without a
 * mark. This rejects arbitrary Latin text such as "hello". */
export function isPinyinSyllable(syllable: string) {
  const normalized = normalize(syllable);
  if (!normalized) return false;
  const { base, marked, chars } = normalized;
  if (!SYLLABLE.test(base)) return false;
  // i, u and ü cannot stand alone; they are written yi, wu and yu.
  if (!INITIAL.test(base) && /^[iuü]/u.test(base)) return false;
  return tonePlacementIsValid(chars, marked);
}

export function validatePinyinOverride(text: string, value: string) {
  if (!value.trim()) return;
  const syllables = value.trim().split(/\s+/);
  const count = Array.from(text).filter((c) =>
    /\p{Script=Han}/u.test(c),
  ).length;
  if (syllables.length !== count)
    throw new Error(
      `Enter ${count} pinyin syllables, one for each Chinese character.`,
    );
  if (syllables.some((syllable) => !isPinyinSyllable(syllable)))
    throw new Error("Use pinyin with tone marks, separated by spaces.");
}
