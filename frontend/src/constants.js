export const MODELS = [
  { id: "bert", label: "BERT" },
  { id: "logreg", label: "TF-IDF + LogReg" },
  { id: "bilstm", label: "BiLSTM + Attn" },
];

export const MODEL_NAMES = Object.fromEntries(MODELS.map((m) => [m.id, m.label]));

export const EXAMPLES = [
  { label: "Profit up", text: "Operating profit rose to EUR 13.1 million from EUR 8.7 million." },
  { label: "Sales down", text: "The company's net sales decreased by 12% compared to last year." },
  { label: "Board meeting", text: "The board will meet on Thursday to discuss the annual report." },
  { label: "Tricky", text: "The company reported a net loss, but it was smaller than analysts had feared." },
];

export const LABEL_ORDER = ["positive", "neutral", "negative"];
export const LOW_CONFIDENCE = 0.6;
export const LABEL_COLOR = { positive: "var(--green)", neutral: "var(--muted)", negative: "var(--red)" };
export const PAGES = {
  sentence: {
    hash: "#sentence",
    name: "Sentence Lab",
    blurb: "Score a single financial sentence with all three models and see exactly which words drove the verdict.",
    tags: ["3 models", "word influence", "batch CSV"],
  },
  article: {
    hash: "#article",
    name: "Article Scanner",
    blurb: "Paste a whole article. Every sentence is scored, highlighted, and summarised into an overall tone.",
    tags: ["sentence heatmap", "overall tone", "top sentences"],
  },
  report: {
    hash: "#report",
    name: "Model Report",
    blurb: "How well each model performs, where it fails, and how it holds up on tweets.",
  },
};