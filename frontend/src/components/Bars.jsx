import { LABEL_COLOR, LABEL_ORDER } from "../constants.js";

export default function Bars({ probs }) {
  return (
    <div>
      {LABEL_ORDER.map((l) => {
        const pct = Math.round((probs[l] ?? 0) * 100);
        return (
          <div className="bar-row" key={l}>
            <span className="bar-label">{l}</span>
            <div className="track" role="img" aria-label={`${l} ${pct}%`}>
              <div className="fill" style={{ width: `${pct}%`, background: LABEL_COLOR[l] }} />
            </div>
            <span className="bar-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
