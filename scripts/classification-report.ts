// Scores the classifier against the hidden ground truth (SPEC.md §4 targets).
//
//   npm run engine:classify-report

import groundTruthJson from "../data/ground-truth.json";
import transactionsJson from "../src/data/transactions.json";
import { CATEGORY_LABELS } from "../src/lib/categories";
import { CONFIDENCE, classifyTransactions, needsReview } from "../src/lib/engine/classify";
import type { GroundTruth, RawTransaction } from "../src/lib/types";

const truth = groundTruthJson as Record<string, GroundTruth>;
const classified = classifyTransactions(transactionsJson as RawTransaction[]);

const isCorrect = (t: (typeof classified)[number]) => t.category === truth[t.id].trueCategory;
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`.padStart(6);

const correct = classified.filter(isCorrect).length;
const flagged = classified.filter(needsReview);
// Accuracy among transactions we don't ask about (what the user sees without answering anything).
const shown = classified.filter((t) => !needsReview(t));

console.log(`\nOverall accuracy:            ${pct(correct, classified.length)}  (${correct}/${classified.length})`);
console.log(`Accuracy when not flagged:   ${pct(shown.filter(isCorrect).length, shown.length)}  (${shown.filter(isCorrect).length}/${shown.length})`);
console.log(`Flagged for review (< ${CONFIDENCE.review}): ${flagged.length}`);

console.log("\nBy description level");
for (const level of [1, 2, 3, 4] as const) {
  const group = classified.filter((t) => truth[t.id].descriptionLevel === level);
  const ok = group.filter(isCorrect).length;
  const review = group.filter(needsReview).length;
  console.log(`  Level ${level}: ${pct(ok, group.length)} correct (${ok}/${group.length}), ${review} flagged`);
}

console.log("\nBy true category");
const categories = [...new Set(Object.values(truth).map((g) => g.trueCategory))];
for (const category of categories) {
  const group = classified.filter((t) => truth[t.id].trueCategory === category);
  const ok = group.filter(isCorrect).length;
  console.log(`  ${CATEGORY_LABELS[category].padEnd(16)} ${pct(ok, group.length)} (${ok}/${group.length})`);
}

console.log("\nConfidence bands");
const bands = [
  ["High (≥ 0.80)", (c: number) => c >= CONFIDENCE.high],
  ["Likely (0.60–0.79)", (c: number) => c >= CONFIDENCE.review && c < CONFIDENCE.high],
  ["Flagged (< 0.60)", (c: number) => c < CONFIDENCE.review],
] as const;
for (const [label, inBand] of bands) {
  const group = classified.filter((t) => inBand(t.confidence));
  console.log(`  ${label.padEnd(20)} ${String(group.length).padStart(3)} transactions, ${pct(group.filter(isCorrect).length, group.length || 1)} correct`);
}

const describe = (t: (typeof classified)[number]) =>
  `${t.id} ${t.date} ${t.direction.padEnd(6)} ₦${t.amount.toLocaleString("en-NG").padStart(8)}  ${(t.description || "(empty)").padEnd(34)} ` +
  `${(t.counterparty ?? "—").padEnd(26)} → ${CATEGORY_LABELS[t.category]} ${t.confidence.toFixed(2)} (truth: ${CATEGORY_LABELS[truth[t.id].trueCategory]})`;

console.log("\nFlagged transactions");
flagged.forEach((t) => console.log(`  ${describe(t)}`));

const wrongNotFlagged = classified.filter((t) => !isCorrect(t) && !needsReview(t));
console.log(`\nWrong but not flagged: ${wrongNotFlagged.length}`);
wrongNotFlagged.forEach((t) => console.log(`  ${describe(t)}`));
console.log("");
