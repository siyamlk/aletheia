// Numbers shown on the Report page. `null` renders as "—".
// Fill the nulls from the notebook: Section 5 (test metrics), Section 6 (errors), Section 8 (CIs).
export const REPORT = {
  headline: [
    { value: "92.66%", label: "BERT test accuracy" },
    { value: "0.9047", label: "BERT macro F1" },
    { value: "92.99 ± 0.49", label: "BERT accuracy across 3 seeds" },
  ],
  models: [
    { name: "BERT", accuracy: "92.66%", f1: "0.9047", external: 0.663 },
    { name: "TF-IDF + Logistic Regression", accuracy: "84.75%", f1: "0.8051", external: 0.435 },
    { name: "BiLSTM + Attention", accuracy: null, f1: null, external: 0.461 },
  ],
  errors: { total: 38, neutralPositive: 23 },
  // Rows = actual, columns = predicted, order: negative, neutral, positive. Example: [[a,b,c],[d,e,f],[g,h,i]]
  confusion: null,
  // Real mistakes from Section 6: [{ text: "...", actual: "neutral", predicted: "positive" }]
  examples: [],
};
