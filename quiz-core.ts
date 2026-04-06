export function createChoiceSet(allChoices: string[], correctAnswer: string): string[] {
  const otherChoices = allChoices.filter((choice) => choice !== correctAnswer);
  const randomChoices = shuffleArray(otherChoices).slice(0, 3);
  return shuffleArray([correctAnswer, ...randomChoices]);
}

export function shuffleArray<T>(array: T[]): T[] {
  const next = [...array];

  // Fisher-Yates shuffle keeps distribution unbiased.
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}
