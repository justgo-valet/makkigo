import { useEffect, useRef, useState } from "react";

const REVEAL_INDEX_ATTRIBUTE = "data-reveal-index";

/**
 * 스크롤 컨테이너 안에서 `data-reveal-index`가 붙은 요소가 처음 보일 때의 등장 지연(ms)을 계산한다.
 * 같은 시점에 함께 보이게 된 요소끼리는 index 순서대로 `staggerMs`씩 지연된다.
 */
const useStaggeredReveal = <T extends HTMLElement>(staggerMs: number) => {
  const rootRef = useRef<T>(null);
  const [revealDelays, setRevealDelays] = useState<ReadonlyMap<number, number>>(new Map());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const enteredIndexes = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => {
            observer.unobserve(entry.target);
            return Number(entry.target.getAttribute(REVEAL_INDEX_ATTRIBUTE));
          })
          .toSorted((a, b) => a - b);

        if (enteredIndexes.length === 0) return;

        setRevealDelays((previous) => {
          const next = new Map(previous);
          enteredIndexes.forEach((index, order) => next.set(index, order * staggerMs));
          return next;
        });
      },
      { root, threshold: 0.1 },
    );

    root
      .querySelectorAll(`[${REVEAL_INDEX_ATTRIBUTE}]`)
      .forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [staggerMs]);

  return { rootRef, revealDelays };
};

export { useStaggeredReveal };
