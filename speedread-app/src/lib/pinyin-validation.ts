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
  if (
    syllables.some((s) => !/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜêńňǹḿ]+$/iu.test(s))
  )
    throw new Error("Use pinyin with tone marks, separated by spaces.");
}
