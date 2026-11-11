const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch {
    throw new Error("Cannot reach the API. It may be starting up, so try again in a moment.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data?.detail;
    const msg =
      typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg).join("; ") : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request("/health"),
  predict: (text, model) => request("/predict", json({ text, model })),
  explain: (text, model) => request("/explain", json({ text, model })),
  analyze: (text, model) => request("/analyze", json({ text, model })),
  batch: (file, model) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/batch?model=${model}`, { method: "POST", body: form });
  },
};
