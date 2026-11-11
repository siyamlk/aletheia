import { useEffect, useState } from "react";
import { api } from "../api.js";
import { EXAMPLES, LABEL_COLOR, LOW_CONFIDENCE, MODELS, MODEL_NAMES } from "../constants.js";
import Bars from "./Bars.jsx";
import WordInfluence from "./WordInfluence.jsx";
import BatchPanel from "./BatchPanel.jsx";
import History from "./History.jsx";

const HISTORY_KEY = "aletheia.history";
const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
};
const saveHistory = (items) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
};

export default function Demo({ health }) {
  const [view, setView] = useState("bert"); // a model id or "compare"
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState(null); // { text, results, flags }
  const [explain, setExplain] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(loadHistory);

  const loaded = health.state === "ok" ? health.loaded : [];
  const primary = view === "compare" ? loaded[0] || "bert" : view;

  // If the selected model isn't available on the server, fall back to one that is.
  useEffect(() => {
    if (health.state === "ok" && view !== "compare" && !loaded.includes(view) && loaded.length) {
      setView(loaded[0]);
    }
  }, [health, view, loaded]);

  // Word influence follows the selected model.
  useEffect(() => {
    if (!analysis) return;
    let alive = true;
    setExplain(null);
    api
      .explain(analysis.text, primary)
      .then((r) => alive && setExplain(r))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [analysis, primary]);

  const run = async (input) => {
    const value = (input ?? text).trim();
    if (!value) {
      setError("Please enter a sentence.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.predict(value, primary);
      setAnalysis(data);
      setText(data.text);
      const label = data.results[primary].label;
      const next = [{ text: data.text, label }, ...history.filter((h) => h.text !== data.text)].slice(0, 6);
      setHistory(next);
      saveHistory(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeWord = (i) => {
    const words = analysis.text.split(" ");
    words.splice(i, 1);
    run(words.join(" "));
  };

  const clear = () => {
    setText("");
    setAnalysis(null);
    setExplain(null);
    setError("");
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const result = analysis?.results[primary];
  const lowConf = result && result.confidence < LOW_CONFIDENCE;
  const offline = health.state === "down";

  return (
    <>
      <div className="split">
        {/* ---------------- left: input ---------------- */}
        <div className="pane">
          <h1 className="h1">Sentence Lab</h1>
          <p className="muted small">
            Score one financial sentence with all three models and see which words drove the result.
          </p>

          <div className="row wrap" role="group" aria-label="Model">
            {MODELS.map((m) => (
              <button
                key={m.id}
                className={"btn" + (view === m.id ? " on" : "")}
                aria-pressed={view === m.id}
                disabled={health.state === "ok" && !loaded.includes(m.id)}
                onClick={() => setView(m.id)}
              >
                {m.label}
              </button>
            ))}
            <button
              className={"btn" + (view === "compare" ? " on" : "")}
              aria-pressed={view === "compare"}
              disabled={loaded.length < 2}
              onClick={() => setView("compare")}
            >
              Compare all
            </button>
          </div>

          <div className="row wrap">
            <span className="muted small">TRY</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                className="btn"
                onClick={() => {
                  setText(ex.text);
                  run(ex.text);
                }}
                disabled={busy || offline}
              >
                {ex.label}
              </button>
            ))}
          </div>

          <label className="box prompt">
            <span className="green">&gt; </span>
            <textarea
              rows={4}
              value={text}
              maxLength={1000}
              placeholder="Paste a sentence from a financial news article…"
              aria-label="Financial sentence"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
              }}
            />
          </label>

          <div className="row wrap">
            <button className="btn on" onClick={() => run()} disabled={busy || offline}>
              {busy ? "Analyzing…" : "Analyze"}
            </button>
            <button className="btn" onClick={clear}>
              Clear
            </button>
            <span className="muted small">Ctrl/⌘ + Enter</span>
          </div>

          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* ---------------- right: results ---------------- */}
        <div className="pane">
          {!analysis && <div className="box muted small">Results will appear here.</div>}

          {analysis && result && (
            <>
              <div className="row wrap">
                {lowConf ? (
                  <span className="badge amber">LOW CONFIDENCE · the model is unsure</span>
                ) : (
                  <span className="badge green">CONFIDENCE HIGH</span>
                )}
                {analysis.flags.models_disagree && <span className="badge amber">MODELS DISAGREE</span>}
                {analysis.flags.informal && (
                  <span className="badge amber">INFORMAL TEXT · accuracy drops ~17–20 pts on tweets</span>
                )}
              </div>

              {view === "compare" ? (
                <div className="grid3">
                  {loaded.map((m) => {
                    const r = analysis.results[m];
                    return (
                      <section className="box" key={m}>
                        <div className="label">{MODEL_NAMES[m]}</div>
                        <div className="verdict small-v" style={{ color: LABEL_COLOR[r.label] }}>
                          {r.label.toUpperCase()} <span className="muted">{Math.round(r.confidence * 100)}%</span>
                        </div>
                        <Bars probs={r.probs} />
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="grid2">
                  <section>
                    <div className="verdict" style={{ color: LABEL_COLOR[result.label] }}>
                      {result.label.toUpperCase()} <span className="muted">{Math.round(result.confidence * 100)}%</span>
                    </div>
                    <Bars probs={result.probs} />
                  </section>
                  <section>
                    <div className="label">ALL MODELS</div>
                    {loaded.map((m) => {
                      const r = analysis.results[m];
                      return (
                        <div key={m} className={"model-row" + (m === primary ? " active" : "")}>
                          <span>{MODEL_NAMES[m]}</span>
                          <span style={{ color: LABEL_COLOR[r.label] }}>
                            {r.label} {Math.round(r.confidence * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </section>
                </div>
              )}

              <section>
                <div className="label">
                  WORD INFLUENCE · {MODEL_NAMES[primary]} · <span className="green">green</span> supports the
                  prediction, <span className="red">red</span> pushes against it · click a word to remove it and re-run
                </div>
                <WordInfluence data={explain} onRemove={removeWord} busy={busy} />
              </section>
            </>
          )}
        </div>
      </div>

      <div className="grid2">
        <BatchPanel model={primary} disabled={offline} />
        <History
          items={history}
          onPick={(t) => {
            setText(t);
            run(t);
          }}
          onClear={clearHistory}
        />
      </div>

      <p className="muted small">
        Trained on Financial PhraseBank (formal news-style English), so it is less reliable on informal text such as
        tweets. Not for trading or investment decisions.
      </p>
    </>
  );
}