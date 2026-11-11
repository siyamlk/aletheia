import { REPORT } from "../reportData.js";

const dash = (v) => (v == null ? "—" : v);

export default function Report() {
  const { headline, models, errors, confusion, examples } = REPORT;
  const names = ["negative", "neutral", "positive"];

  return (
    <>
      <h1 className="h1">Model report</h1>

      <div className="grid3">
        {headline.map((h) => (
          <div className="box" key={h.label}>
            <div className="stat green">{h.value}</div>
            <div className="muted small">{h.label}</div>
          </div>
        ))}
      </div>

      <section className="box">
        <div className="label">TEST SET AND EXTERNAL (TWEETS) RESULTS</div>
        <table>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Accuracy</th>
              <th scope="col">Macro F1</th>
              <th scope="col">Tweets macro F1</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                <td>{dash(m.accuracy)}</td>
                <td>{dash(m.f1)}</td>
                <td>{dash(m.external)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid2">
        <section className="box">
          <div className="label">GENERALIZATION: MACRO F1 ON TWEETS</div>
          {models.map((m, i) => (
            <div className="bar-row" key={m.name}>
              <span className="bar-label wide">{m.name.split(" ")[0]}</span>
              <div className="track">
                <div className="fill" style={{ width: `${(m.external ?? 0) * 100}%`, background: i === 0 ? "var(--green)" : "var(--muted)" }} />
              </div>
              <span className="bar-pct">{dash(m.external)}</span>
            </div>
          ))}
        </section>

        <section className="box">
          <div className="label">BERT CONFUSION MATRIX (rows actual, columns predicted)</div>
          <div className="cm" style={{ gridTemplateColumns: "auto repeat(3, 1fr)" }}>
            <span />
            {names.map((n) => (
              <span className="muted small" key={n}>{n}</span>
            ))}
            {names.map((actual, r) => [
              <span className="muted small" key={actual}>{actual}</span>,
              ...names.map((_, c) => (
                <span className={"cm-cell" + (r === c ? " diag" : "")} key={`${r}${c}`}>
                  {dash(confusion?.[r]?.[c])}
                </span>
              )),
            ])}
          </div>
        </section>
      </div>

      <section className="box">
        <div className="label">
          BERT ERRORS: {errors.neutralPositive} OF {errors.total} ARE NEUTRAL ↔ POSITIVE
        </div>
        <div className="bar-row">
          <span className="bar-label wide">neu ↔ pos</span>
          <div className="track">
            <div className="fill" style={{ width: `${(errors.neutralPositive / errors.total) * 100}%`, background: "var(--amber)" }} />
          </div>
          <span className="bar-pct">{Math.round((errors.neutralPositive / errors.total) * 100)}%</span>
        </div>
        {examples.map((e, i) => (
          <p className="small" key={i}>
            “{e.text}” <span className="muted">true: {e.actual} · predicted: {e.predicted}</span>
          </p>
        ))}
      </section>

      <p className="muted small">
        Small dataset (~3,400 sentences), formal news-style English only. Retraining gives slightly different numbers.
      </p>
    </>
  );
}
