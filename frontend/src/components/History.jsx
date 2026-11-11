import { LABEL_COLOR } from "../constants.js";

export default function History({ items, onPick, onClear }) {
  return (
    <section className="box">
      <div className="label">RECENT</div>
      {items.length === 0 && <p className="muted small">Nothing yet.</p>}
      {items.map((h, i) => (
        <button key={i} className="hist" onClick={() => onPick(h.text)} title={h.text}>
          <span className="clip">{h.text}</span>
          <span style={{ color: LABEL_COLOR[h.label] }}>{h.label}</span>
        </button>
      ))}
      {items.length > 0 && (
        <button className="link" onClick={onClear}>
          clear history
        </button>
      )}
    </section>
  );
}
