import { PAGES } from "../constants.js";

export default function Nav({ page, health, slow }) {
  let status;
  if (health.state === "ok") {
    status = (
      <span>
        <span className="green">●</span> API online · {health.loaded.length}/3 models loaded
      </span>
    );
  } else if (health.state === "down") {
    status = (
      <span>
        <span className="red">○</span> API unreachable
      </span>
    );
  } else {
    status = <span>{slow ? "Waking up the server… the first request can take a minute" : "Connecting…"}</span>;
  }

  return (
    <header className="nav">
      <nav className="row" aria-label="Pages">
        <a href="#" className="brand" aria-current={page === "home" ? "page" : undefined}>ALETHEIA</a>
        {Object.entries(PAGES).map(([id, p]) => (
          <a
            key={id}
            href={p.hash}
            className={page === id ? "green" : "muted"}
            aria-current={page === id ? "page" : undefined}
          >
            {p.name.toUpperCase()}
          </a>
        ))}
      </nav>
      <span className="muted small" role="status">
        {status}
      </span>
    </header>
  );
}