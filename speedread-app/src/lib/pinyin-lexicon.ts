/** Curated readings for words that a character-level dictionary gets wrong.
 * The automatic engine stays the default; this table only covers common
 * polyphones, neutral tones and traditional variants. User corrections are
 * applied after this table and therefore always win. */
const HAN = /\p{Script=Han}/u;

export const PINYIN_PHRASES: Readonly<Record<string, string>> = {
  // Neutral tones (both scripts).
  "时候": "shí hou",
  "時候": "shí hou",
  "舒服": "shū fu",
  "清楚": "qīng chu",
  "明白": "míng bai",
  "告诉": "gào su",
  "告訴": "gào su",
  "照顾": "zhào gu",
  "照顧": "zhào gu",
  "客气": "kè qi",
  "客氣": "kè qi",
  "运气": "yùn qi",
  "運氣": "yùn qi",
  "眼睛": "yǎn jing",
  "事情": "shì qing",
  "朋友": "péng you",
  "先生": "xiān sheng",
  "学生": "xué sheng",
  "學生": "xué sheng",
  "鞋子": "xié zi",
  "商量": "shāng liang",
  "热闹": "rè nao",
  "熱鬧": "rè nao",
  "打听": "dǎ ting",
  "打聽": "dǎ ting",

  // 学生 is neutral on its own but not in these compounds.
  "大学生": "dà xué shēng",
  "大學生": "dà xué shēng",
  "中学生": "zhōng xué shēng",
  "中學生": "zhōng xué shēng",
  "小学生": "xiǎo xué shēng",
  "小學生": "xiǎo xué shēng",
  "高中生": "gāo xué shēng",
  "留学生": "liú xué shēng",
  "留學生": "liú xué shēng",

  // The complement 得 is neutral in these frequent phrases.
  "跑得快": "pǎo de kuài",
  "说得好": "shuō de hǎo",
  "說得好": "shuō de hǎo",
  "做得好": "zuò de hǎo",
  "记得": "jì de",
  "記得": "jì de",
  "懂得": "dǒng de",
  "晓得": "xiǎo de",
  "曉得": "xiǎo de",
  "舍得": "shě de",
  "捨得": "shě de",
  "值得": "zhí de",
  "认得": "rèn de",
  "認得": "rèn de",
  "显得": "xiǎn de",
  "顯得": "xiǎn de",
  "懒得": "lǎn de",
  "懶得": "lǎn de",
  "免得": "miǎn de",
  "省得": "shěng de",
  "还得": "hái děi",
  "還得": "hái děi",

  // 著/着: zháo, zhuó, zhù and the aspect particle zhe.
  "着火": "zháo huǒ",
  "著火": "zháo huǒ",
  "着急": "zháo jí",
  "著急": "zháo jí",
  "着凉": "zháo liáng",
  "著涼": "zháo liáng",
  "着迷": "zháo mí",
  "著迷": "zháo mí",
  "着魔": "zháo mó",
  "著魔": "zháo mó",
  "睡着了": "shuì zháo le",
  "睡著了": "shuì zháo le",
  "着陆": "zhuó lù",
  "著陸": "zhuó lù",
  "着手": "zhuó shǒu",
  "著手": "zhuó shǒu",
  "着重": "zhuó zhòng",
  "著重": "zhuó zhòng",
  "着眼": "zhuó yǎn",
  "著眼": "zhuó yǎn",
  "着力": "zhuó lì",
  "著力": "zhuó lì",
  "着实": "zhuó shí",
  "著實": "zhuó shí",
  "着想": "zhuó xiǎng",
  "著想": "zhuó xiǎng",
  "着落": "zhuó luò",
  "著落": "zhuó luò",
  "看着": "kàn zhe",
  "看著": "kàn zhe",
  "走着": "zǒu zhe",
  "走著": "zǒu zhe",
  "等着": "děng zhe",
  "等著": "děng zhe",
  "拿着": "ná zhe",
  "拿著": "ná zhe",
  "笑着": "xiào zhe",
  "笑著": "xiào zhe",
  "说着": "shuō zhe",
  "說著": "shuō zhe",
  "坐着": "zuò zhe",
  "坐著": "zuò zhe",
  "站着": "zhàn zhe",
  "站著": "zhàn zhe",
  "躺着": "tǎng zhe",
  "躺著": "tǎng zhe",
  "想着": "xiǎng zhe",
  "想著": "xiǎng zhe",
  "开着": "kāi zhe",
  "開著": "kāi zhe",
  "关着": "guān zhe",
  "關著": "guān zhe",
  "忙着": "máng zhe",
  "忙著": "máng zhe",
  "接着": "jiē zhe",
  "接著": "jiē zhe",
  "随着": "suí zhe",
  "隨著": "suí zhe",
  "沿着": "yán zhe",
  "沿著": "yán zhe",
  "向着": "xiàng zhe",
  "向著": "xiàng zhe",
  "为着": "wèi zhe",
  "為著": "wèi zhe",

  // 乾 is gān for dry and qián in 乾隆/乾坤. The base engine already
  // handles the qián words; these are the dry compounds it misses.
  "干净": "gān jìng",
  "乾淨": "gān jìng",
  "干燥": "gān zào",
  "乾燥": "gān zào",
  "干杯": "gān bēi",
  "乾杯": "gān bēi",
  "干旱": "gān hàn",
  "乾旱": "gān hàn",
  "饼干": "bǐng gān",
  "餅乾": "bǐng gān",
  "晒干": "shài gān",
  "曬乾": "shài gān",
  "擦干": "cā gān",
  "擦乾": "cā gān",
  "干洗": "gān xǐ",
  "乾洗": "gān xǐ",
  "干粮": "gān liáng",
  "乾糧": "gān liáng",
  "干涸": "gān hé",
  "乾涸": "gān hé",

  // 瞭 is liǎo in 了解 and liào in 瞭望.
  "了解": "liǎo jiě",
  "瞭解": "liǎo jiě",
  "瞭望": "liào wàng",
  "了望": "liào wàng",

  // 還/还: the context rule below covers unlisted sentences. These explicit
  // entries keep the common hái phrases and the ambiguous 还以颜色 stable.
  "还是": "hái shì",
  "還是": "hái shì",
  "还有": "hái yǒu",
  "還有": "hái yǒu",
  "还好": "hái hǎo",
  "還好": "hái hǎo",
  "还能": "hái néng",
  "還能": "hái néng",
  "还会": "hái huì",
  "還會": "hái huì",
  "还在": "hái zài",
  "還在": "hái zài",
  "还没": "hái méi",
  "還沒": "hái méi",
  "还要": "hái yào",
  "還要": "hái yào",
  "还想": "hái xiǎng",
  "還想": "hái xiǎng",
  "还可以": "hái kě yǐ",
  "還可以": "hái kě yǐ",
  "还以为": "hái yǐ wéi",
  "還以為": "hái yǐ wéi",
  "还不错": "hái bú cuò",
  "還不錯": "hái bú cuò",
  "还是要": "hái shì yào",
  "還是要": "hái shì yào",
  "还以颜色": "huán yǐ yán sè",
  "還以顏色": "huán yǐ yán sè",

  // 到处/到處 and the frequent polyphones that must not regress.
  "到处": "dào chù",
  "到處": "dào chù",
  "银行": "yín háng",
  "銀行": "yín háng",
  "行长": "háng zhǎng",
  "行長": "háng zhǎng",
  "行业": "háng yè",
  "行業": "háng yè",
  "行为": "xíng wéi",
  "行為": "xíng wéi",
  "音乐": "yīn yuè",
  "音樂": "yīn yuè",
  "快乐": "kuài lè",
  "快樂": "kuài lè",
  "头发": "tóu fa",
  "頭髮": "tóu fa",
  "发现": "fā xiàn",
  "發現": "fā xiàn",
  "睡觉": "shuì jiào",
  "睡覺": "shuì jiào",
  "觉得": "jué de",
  "覺得": "jué de",
  "高兴": "gāo xìng",
  "高興": "gāo xìng",
  "处理": "chǔ lǐ",
  "處理": "chǔ lǐ",
  "重庆": "chóng qìng",
  "重慶": "chóng qìng",
  "重复": "chóng fù",
  "重複": "chóng fù",
  "重要": "zhòng yào",
  "长大": "zhǎng dà",
  "長大": "zhǎng dà",
  "长江": "cháng jiāng",
  "長江": "cháng jiāng",
  "论语": "lún yǔ",
  "論語": "lún yǔ",
  "阿房宫": "ē páng gōng",
  "阿房宮": "ē páng gōng",
};

const HUAN_BEFORE = new Set([
  "归", "歸", "偿", "償", "返", "退", "交", "借", "索", "发", "發", "缴", "繳", "领", "領",
]);

const HUAN_AFTER = new Set([
  "钱", "錢", "款", "债", "債", "书", "書", "给", "給", "原", "击", "擊", "手", "价", "價",
  "清", "乡", "鄉", "俗", "愿", "願", "贷", "貸", "帐", "帳", "账", "賬", "礼", "禮", "魂",
  "阳", "陽", "童", "席", "嘴", "牙", "了",
]);

/** 還 is hái when it means "still" and huán when it means "return". The base
 * dictionary reads it huán almost everywhere, so use the neighbouring
 * character to resolve the common cases. Explicit phrases are applied after
 * this rule and can override it. */
export function applyHuanReadings(
  text: string,
  readings: Map<number, string>,
) {
  const chars = Array.from(text);
  const offsets: number[] = [];
  let offset = 0;
  for (const char of chars) {
    offsets.push(offset);
    offset += char.length;
  }
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== "還" && chars[i] !== "还") continue;
    const previous = chars[i - 1] ?? "";
    const next = chars[i + 1] ?? "";
    readings.set(
      offsets[i],
      HUAN_BEFORE.has(previous) || HUAN_AFTER.has(next) ? "huán" : "hái",
    );
  }
}

const PHRASES = Object.entries(PINYIN_PHRASES)
  .map(([phrase, value]) => ({ phrase, syllables: value.split(" ") }))
  .sort((a, b) => b.phrase.length - a.phrase.length);

/** Apply the longest matching phrases first and claim their character
 * positions so a shorter phrase cannot overwrite part of a longer word. */
export function applyPinyinPhrases(
  text: string,
  readings: Map<number, string>,
) {
  const claimed = new Set<number>();
  for (const { phrase, syllables } of PHRASES) {
    let from = 0;
    while (from <= text.length - phrase.length) {
      const at = text.indexOf(phrase, from);
      if (at < 0) break;
      const positions: number[] = [];
      let cursor = at;
      for (const char of Array.from(phrase)) {
        if (HAN.test(char)) positions.push(cursor);
        cursor += char.length;
      }
      if (
        positions.length === syllables.length &&
        positions.every((position) => !claimed.has(position))
      ) {
        positions.forEach((position, index) => {
          readings.set(position, syllables[index] ?? "");
          claimed.add(position);
        });
      }
      from = at + phrase.length;
    }
  }
}
