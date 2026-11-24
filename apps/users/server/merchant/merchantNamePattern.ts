import "server-only";

const HANGUL_SYLLABLE_START = 0xac00;
const SYLLABLES_PER_INITIAL = 588;
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const REGEX_SPECIAL_CHARACTERS = /[\\^$.*+?()[\]{}|]/g;

const toPatternCharacter = (character: string) => {
  const initialIndex = INITIALS.indexOf(character);

  if (initialIndex < 0) return character.replace(REGEX_SPECIAL_CHARACTERS, "\\$&");

  const first = HANGUL_SYLLABLE_START + initialIndex * SYLLABLES_PER_INITIAL;
  const last = first + SYLLABLES_PER_INITIAL - 1;

  return `[${character}${String.fromCharCode(first)}-${String.fromCharCode(last)}]`;
};

const toMerchantNamePattern = (query: string) => Array.from(query, toPatternCharacter).join("");

export { toMerchantNamePattern };
