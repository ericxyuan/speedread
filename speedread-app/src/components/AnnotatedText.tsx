/** Each annotation has its own character cell. Whole-word ruby distributes long
 * syllables across neighbours, so it cannot promise character-level alignment. */
export function AnnotatedText({
  text,
  pinyin,
  show = true,
}: {
  text: string;
  pinyin?: string[];
  show?: boolean;
}) {
  if (!/\p{Script=Han}/u.test(text)) return <>{text}</>;
  return (
    <>
      {Array.from(text).map((char, index) =>
        /\p{Script=Han}/u.test(char) ? (
          <ruby className="cjk-cell" data-character={char} key={index}>
            <span className="hanzi">{char}</span>
            {show && pinyin && (
              <rt
                className={!pinyin[index] ? "pinyin unknown" : "pinyin"}
                data-pinyin={pinyin[index] || ""}
                aria-label={
                  !pinyin[index] ? "Pronunciation needs review" : undefined
                }
              >
                {pinyin[index] || "·"}
              </rt>
            )}
          </ruby>
        ) : (
          <span key={index}>{char}</span>
        ),
      )}
    </>
  );
}
