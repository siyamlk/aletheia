import { useRef, useState } from "react";
import { api } from "../api.js";
import { LABEL_COLOR, MODEL_NAMES } from "../constants.js";

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;

function toCsv(rows) {
  const head = "text,label,confidence,negative,neutral,positive";
  const body = rows.map((r) =>
    [esc(r.text), r.label, r.confidence.toFixed(4), r.probs.negative.toFixed(4), r.probs.neutral.toFixed(4), r.probs.positive.toFixed(4)].join(",")
  );
  return [head, ...body].join("\n");
}

export default function BatchPanel({ model, disabled }) {
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, error: "", result: null });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState({ busy: true, error: "", result: null });
    try {
      setState({ busy: false, error: "", result: await api.batch(file, model) });
    } catch (err) {
      setState({ busy: false, error: err.message, result: null });
    }
  };

  const download = () => {
    const blob = new Blob([toCsv(state.result.rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aletheia_results.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const { busy, error, result } = state;
  return (
    <section className="box">
      <div className="label">BATCH · {MODEL_NAMES[model]}</div>
      <p className="muted small">CSV with a "text" column, up to 200 rows.</p>
      <div className="row wrap">
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        <button className="btn" onClick={() => input.current.click()} disabled={disabled || busy}>
          {busy ? "Running…" : "Upload CSV"}
        </button>
        {result && (
          <button className="btn" onClick={download}>
            Download results
          </button>
        )}
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {result && (
        <div className="batch-table">
          <p className="muted small">{result.count} sentences</p>
          {result.rows.slice(0, 8).map((r, i) => (
            <div className="hist static" key={i}>
              <span className="clip">{r.text}</span>
              <span style={{ color: LABEL_COLOR[r.label] }}>
                {r.label} {Math.round(r.confidence * 100)}%
              </span>
            </div>
          ))}
          {result.count > 8 && <p className="muted small">…and {result.count - 8} more in the download.</p>}
        </div>
      )}
    </section>
  );
}
