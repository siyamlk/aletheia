import { useEffect, useState } from "react";
import { api } from "../api.js";
import { LABEL_COLOR, LOW_CONFIDENCE, MODELS, MODEL_NAMES } from "../constants.js";
import Bars from "./Bars.jsx";

const MAX_CHARS = 20000;

const SAMPLE = `Operating profit rose to EUR 13.1 million from EUR 8.7 million in the corresponding period last year. Net sales increased by 9% to EUR 120 million. However, the company said raw material costs weighed on margins in the second half. The board will meet on Thursday to discuss the annual report. The company issued a profit warning for its Nordic division and cut its full-year outlook.`;

const toneText = { positive: "POSITIVE", negative: "NEGATIVE", neutral: "NEUTRAL / MIXED" };

function rgba(label, confidence) {
  if (label === "neutral") return "transparent";
  const rgb = label === "positive" ? "61,220,132" : "255,92,92";
  return `rgba(${rgb},${(0.12 + confidence * 0.38).toFixed(2)})`;
}

export default function Analyzer({ health }) {
  const [text, setText] = useState("");
  const [model, setModel] = useState("bert");
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loaded = health.state === "ok" ? health.loaded : [];
  const offline = health.state === "down";

  useEffect(() => {
    if (health.state === "ok" && !loaded.includes(model) && loaded.length) setModel(loaded[0]);
  }, [health, model, loaded]);

  const run = async (input = text, m = model) => {
    if (!input.trim()) {
      setError("Please paste some text.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.analyze(input, m);
      setData(result);
      setSelected(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pickModel = (id) => {
    setModel(id);
    if (data) run(text, id);
  };

  const s = selected != null ? data?.sentences[selected] : null;
  const pct = Math.round(((data?.score ?? 0) + 1) * 50); // -1..1 -> 0..100

  return (
    <>
      <h1 className="h1">Article Scanner</h1>
      <p className="muted small">
        Paste a news article or report. Each sentence is scored separately, then summarised. The models were trained on
        single sentences, so the overall tone is an average, not a judgement of the whole piece.
      </p>

      <div className="row wrap" role="group" aria-label="Model">
        {MODELS.map((m) => (
          <button
            key={m.id}
            className={"btn" + (model === m.id ? " on" : "")}
            aria-pressed={model === m.id}
            disabled={busy || (health.state === "ok" && !loaded.includes(m.id))}
            onClick={() => pickModel(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <label className="box">
        <textarea
          className="article-input"
          rows={7}
          value={text}
          maxLength={MAX_CHARS}
          placeholder="Paste an article here…"
          aria-label="Article text"
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <div className="row wrap">
        <button className="btn on" onClick={() => run()} disabled={busy || offline}>
          {busy ? "Analyzing…" : "Analyze article"}
        </button>
        <button
          className="btn"
          disabled={busy || offline}
          onClick={() => {
            setText(SAMPLE);
            run(SAMPLE);
          }}
        >
          Try a sample
        </button>
        <button
          className="btn"
          onClick={() => {
            setText("");
            setData(null);
            setSelected(null);
            setError("");
          }}
        >
          Clear
        </button>
        <span className="muted small">
          {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="box">
            <div className="label">OVERALL TONE · {MODEL_NAMES[data.model]} · {data.count} sentences</div>
            <div className="verdict" style={{ color: LABEL_COLOR[data.tone] }}>
              {toneText[data.tone]} <span className="muted">{data.score >= 0 ? "+" : ""}{data.score.toFixed(2)}</span>
            </div>
            <div className="scale" role="img" aria-label={`Tone score ${data.score.toFixed(2)} on a scale from -1 to +1`}>
              <div className="scale-mid" />
              <div className="scale-dot" style={{ left: `${pct}%` }} />
            </div>
            <div className="row scale-labels small muted">
              <span>negative −1</span>
              <span>0</span>
              <span>+1 positive</span>
            </div>
            <div className="stack" aria-hidden="true">
              {["positive", "neutral", "negative"].map((l) => (
                <div key={l} style={{ width: `${(data.counts[l] / data.count) * 100}%`, background: LABEL_COLOR[l] }} />
              ))}
            </div>
            <div className="row wrap small">
              {["positive", "neutral", "negative"].map((l) => (
                <span key={l} style={{ color: LABEL_COLOR[l] }}>
                  {data.counts[l]} {l}
                </span>
              ))}
            </div>
          </section>

          <section>
            <div className="label">
              THE ARTICLE · <span className="green">green</span> positive, <span className="red">red</span> negative,
              brighter = more confident · click a sentence for details
            </div>
            <div className="article" role="list">
              {data.sentences.map((x, i) => (
                <button
                  key={i}
                  role="listitem"
                  className={"sent" + (selected === i ? " sel" : "")}
                  style={{ background: rgba(x.label, x.confidence) }}
                  onClick={() => setSelected(selected === i ? null : i)}
                  title={`${x.label} ${Math.round(x.confidence * 100)}%`}
                >
                  {x.text}{" "}
                </button>
              ))}
            </div>
          </section>

          {s && (
            <section className="box">
              <div className="label">SELECTED SENTENCE</div>
              <p>“{s.text}”</p>
              <div className="verdict small-v" style={{ color: LABEL_COLOR[s.label] }}>
                {s.label.toUpperCase()} <span className="muted">{Math.round(s.confidence * 100)}%</span>
              </div>
              {s.confidence < LOW_CONFIDENCE && <span className="badge amber">LOW CONFIDENCE · the model is unsure</span>}
              <Bars probs={s.probs} />
            </section>
          )}

          <div className="grid2">
            {[
              ["MOST POSITIVE", data.top_positive, "positive"],
              ["MOST NEGATIVE", data.top_negative, "negative"],
            ].map(([title, idxs, label]) => (
              <section className="box" key={title}>
                <div className="label">{title}</div>
                {idxs.length === 0 && <p className="muted small">None.</p>}
                {idxs.map((i) => (
                  <button key={i} className="hist wrapped" onClick={() => setSelected(i)}>
                    <span>{data.sentences[i].text}</span>
                    <span style={{ color: LABEL_COLOR[label] }}>{Math.round(data.sentences[i].confidence * 100)}%</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </>
      )}

      <p className="muted small">
        Trained on formal news-style English; less reliable on informal text. Not for trading or investment decisions.
      </p>
    </>
  );
}