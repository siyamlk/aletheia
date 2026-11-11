import { PAGES } from "../constants.js";

export default function Home() {
  const tools = [PAGES.sentence, PAGES.article];
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Read the tone of financial text.</h1>
        <p className="muted">Three models, explained word by word. Pick a tool to start.</p>
      </section>

      <div className="grid2 cards">
        {tools.map((t) => (
          <a key={t.hash} href={t.hash} className="card">
            <span className="card-title">{t.name}</span>
            <span className="card-blurb">{t.blurb}</span>
            <span className="card-tags">
              {t.tags.map((x) => (
                <span key={x} className="tag">{x}</span>
              ))}
            </span>
            <span className="card-go green">Open →</span>
          </a>
        ))}
      </div>

      <a href={PAGES.report.hash} className="card slim">
        <span>
          <span className="card-title small-title">{PAGES.report.name}</span>
          <span className="card-blurb">{PAGES.report.blurb}</span>
        </span>
        <span className="card-go green">View →</span>
      </a>

      <p className="muted small">
        Trained on Financial PhraseBank (formal news-style English). Not for trading or investment decisions.
      </p>
    </>
  );
}