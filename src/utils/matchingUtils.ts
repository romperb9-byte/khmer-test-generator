import { Question } from '../types';

export interface ShuffledMatchingResult {
  rightItems: { right: string; originalIndex: number }[];
  correctLetterByLeftIndex: Record<number, string>;
}

/**
 * Deterministically shuffles the right column of a MATCHING question
 * so answers are never in trivial 1-A, 2-B, 3-C order, while keeping
 * grading and display 100% consistent across Teacher, Student, and Principal views.
 */
export function getShuffledMatching(question: Question): ShuffledMatchingResult {
  const pairs = question.matchingPairs || [];
  const distractors = (question.distractors || []).map((d, idx) => ({
    right: d,
    originalIndex: pairs.length + idx,
  }));

  const items = [
    ...pairs.map((p, idx) => ({ right: p.right, originalIndex: idx })),
    ...distractors,
  ];

  // Deterministic seed from question id + question text
  const seedStr = `${question.id || ''}:${question.question || ''}`;
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  // Fisher-Yates shuffle with LCG PRNG
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  // Avoid leaving all pairs in trivial identity order (0->A, 1->B, ...)
  if (pairs.length > 1 && shuffled.every((item, idx) => idx >= pairs.length || item.originalIndex === idx)) {
    const first = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = first;
  }

  const correctLetterByLeftIndex: Record<number, string> = {};
  shuffled.forEach((item, sIdx) => {
    if (item.originalIndex < pairs.length) {
      correctLetterByLeftIndex[item.originalIndex] = String.fromCharCode(65 + sIdx);
    }
  });

  return {
    rightItems: shuffled,
    correctLetterByLeftIndex,
  };
}
