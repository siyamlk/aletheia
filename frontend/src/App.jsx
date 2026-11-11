import { useEffect, useState } from "react";
import { api } from "./api.js";
import Nav from "./components/Nav.jsx";
import Home from "./components/Home.jsx";
import Demo from "./components/Demo.jsx";
import Report from "./components/Report.jsx";
import Analyzer from "./components/Analyzer.jsx";

const ROUTES = { "#sentence": "sentence", "#article": "article", "#report": "report" };
const pageFromHash = () => ROUTES[window.location.hash] || "home";

export default function App() {
  const [page, setPage] = useState(pageFromHash);
  const [health, setHealth] = useState({ state: "loading" });
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => alive && setSlow(true), 3000);
    api
      .health()
      .then((h) => alive && setHealth({ state: "ok", ...h }))
      .catch(() => alive && setHealth({ state: "down" }))
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="app">
      <Nav page={page} health={health} slow={slow} />
      {page === "home" && <Home />}
      {page === "sentence" && <Demo health={health} />}
      {page === "article" && <Analyzer health={health} />}
      {page === "report" && <Report />}
    </div>
  );
}