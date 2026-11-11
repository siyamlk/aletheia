// Signed leave-one-word-out scores: green supports the predicted label, red pushes against it.
export default function WordInfluence({ data, onRemove, busy }) {
  if (!data) return <p className="muted small">Computing word influence…</p>;
  return (
    <div className="words">
      {data.words.map((w, i) => {
        const rgb = w.score >= 0 ? "61,220,132" : "255,92,92";
        const alpha = Math.min(0.12 + Math.abs(w.score) * 1.4, 0.95).toFixed(2);
        return (
          <button
            key={i}
            className="word"
            style={{ background: `rgba(${rgb},${alpha})` }}
            title={`${w.score >= 0 ? "+" : ""}${w.score.toFixed(3)}: click to remove this word and re-run`}
            onClick={() => onRemove(i)}
            disabled={busy}
          >
            {w.word}
          </button>
        );
      })}
    </div>
  );
}
