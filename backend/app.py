"""Aletheia API: financial sentiment (BERT, TF-IDF + LogReg, BiLSTM + Attention).

Endpoints
    GET  /health    which models are loaded
    POST /predict   all loaded models on one sentence + uncertainty flags
    POST /explain   signed leave-one-word-out influence for one model
    POST /batch     CSV upload (column "text"), one model, up to MAX_BATCH rows
"""
import csv
import io
import logging
import os
import pickle
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer

log = logging.getLogger("aletheia")
logging.basicConfig(level=logging.INFO)

# ----------------------------------------------------------------- config
MODEL_DIR = Path(os.getenv("MODEL_DIR", "models"))
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    if o.strip()
]
# e.g. https://.*\.vercel\.app to allow Vercel preview deployments
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX") or None

LABELS = ["negative", "neutral", "positive"]  # 0, 1, 2 (same as the notebook)
BERT_MAX_LEN = 128
LSTM_MAX_LEN = 55
MAX_CHARS = 1000
MAX_EXPLAIN_WORDS = 120
MAX_BATCH = 200
MAX_UPLOAD_BYTES = 1_000_000
MAX_ANALYZE_CHARS = 20_000
MAX_SENTENCES = 150
TONE_THRESHOLD = 0.15  
LOW_CONFIDENCE = 0.60

ModelId = Literal["bert", "logreg", "bilstm"]
MODEL_NAMES = {
    "bert": "BERT",
    "logreg": "TF-IDF + Logistic Regression",
    "bilstm": "BiLSTM + Attention",
}

# Cashtags, @mentions, #hashtags, URLs, emoji: signals of tweet-style text,
# where every model dropped 17-20 accuracy points in the notebook (Section 9).
INFORMAL = re.compile(r"(https?://|www\.|@\w+|#\w+|\$[A-Za-z]{1,5}\b|[\U0001F300-\U0001FAFF])")


# --------------------------------------------------------------- registry
class Registry:
    """Loads every model that is available and runs inference behind one lock."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.bert_tok = None
        self.bert = None
        self.lr = None
        self.lstm = None
        self.lstm_tok = None
        self.errors: dict[str, str] = {}
        self._lock = threading.Lock()

    def load(self) -> None:
        self._load_bert()
        self._load_logreg()
        self._load_bilstm()
        log.info("Loaded models: %s", self.available())
        for name, err in self.errors.items():
            log.warning("Model %s not loaded: %s", name, err)

    def _load_bert(self) -> None:
        try:
            path = MODEL_DIR / "aletheia_bert"
            self.bert_tok = AutoTokenizer.from_pretrained(path)
            self.bert = AutoModelForSequenceClassification.from_pretrained(path)
            self.bert.to(self.device).eval()
        except Exception as e:  # noqa: BLE001
            self.bert = None
            self.errors["bert"] = str(e)

    def _load_logreg(self) -> None:
        try:
            bundle = joblib.load(MODEL_DIR / "aletheia_logistic_regression.joblib")
            self.lr = {"model": bundle["model"], "vectorizer": bundle["vectorizer"]}
        except Exception as e:  # noqa: BLE001
            self.lr = None
            self.errors["logreg"] = str(e)

    def _load_bilstm(self) -> None:
        try:
            import keras
            import tensorflow as tf
            from tensorflow.keras.layers import Dense, Layer

            # Must match the layer defined in the notebook (Section 3.2).
            @keras.saving.register_keras_serializable()
            class AttentionLayer(Layer):
                def __init__(self, **kwargs):
                    super().__init__(**kwargs)
                    self.supports_masking = True
                    self.attention_dense = Dense(1)

                def call(self, inputs, mask=None):
                    scores = tf.squeeze(self.attention_dense(inputs), axis=-1)
                    if mask is not None:
                        scores = tf.where(mask, scores, tf.cast(-1e9, scores.dtype))
                    weights = tf.nn.softmax(scores, axis=1)
                    return tf.reduce_sum(inputs * tf.expand_dims(weights, axis=-1), axis=1)

                def compute_mask(self, inputs, mask=None):
                    return None

            self.lstm = keras.models.load_model(
                MODEL_DIR / "aletheia_bilstm.keras",
                custom_objects={"AttentionLayer": AttentionLayer, "Custom>AttentionLayer": AttentionLayer},
            )
            with open(MODEL_DIR / "aletheia_tokenizer.pkl", "rb") as f:
                self.lstm_tok = pickle.load(f)
        except Exception as e:  # noqa: BLE001
            self.lstm = None
            self.lstm_tok = None
            self.errors["bilstm"] = str(e)

    def available(self) -> list[str]:
        out = []
        if self.bert is not None:
            out.append("bert")
        if self.lr is not None:
            out.append("logreg")
        if self.lstm is not None:
            out.append("bilstm")
        return out

    def probs(self, model: str, texts: list[str]) -> np.ndarray:
        """Class probabilities, shape (len(texts), 3), columns = LABELS."""
        with self._lock:
            if model == "bert":
                chunks = []
                for i in range(0, len(texts), 32):
                    enc = self.bert_tok(
                        texts[i : i + 32],
                        padding=True,
                        truncation=True,
                        max_length=BERT_MAX_LEN,
                        return_tensors="pt",
                    ).to(self.device)
                    with torch.inference_mode():
                        logits = self.bert(**enc).logits
                    chunks.append(torch.softmax(logits, dim=-1).cpu().numpy())
                return np.concatenate(chunks)

            if model == "logreg":
                feats = self.lr["vectorizer"].transform(texts)
                p = self.lr["model"].predict_proba(feats)
                return p[:, np.argsort(self.lr["model"].classes_)]

            if model == "bilstm":
                from tensorflow.keras.preprocessing.sequence import pad_sequences

                seq = self.lstm_tok.texts_to_sequences(texts)
                x = pad_sequences(seq, maxlen=LSTM_MAX_LEN, padding="post", truncating="post")
                return self.lstm.predict(x, batch_size=64, verbose=0)

        raise ValueError(f"Unknown model: {model}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    reg = Registry()
    reg.load()
    app.state.reg = reg
    yield


app = FastAPI(title="Aletheia API", version="1.0.0", lifespan=lifespan)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers
def clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        raise HTTPException(422, "Please enter a sentence.")
    if len(text) > MAX_CHARS:
        raise HTTPException(422, f"Text is too long (max {MAX_CHARS} characters).")
    return text


def summarize(p: np.ndarray) -> dict:
    i = int(np.argmax(p))
    return {
        "label": LABELS[i],
        "confidence": float(p[i]),
        "probs": {l: float(v) for l, v in zip(LABELS, p)},
    }


def require(model: str) -> Registry:
    reg: Registry = app.state.reg
    if model not in reg.available():
        raise HTTPException(503, f"Model '{model}' is not loaded on this server.")
    return reg


# -------------------------------------------------------------- endpoints
class PredictRequest(BaseModel):
    text: str
    model: ModelId = "bert"  # primary model: drives the verdict + low-confidence flag


class ExplainRequest(BaseModel):
    text: str
    model: ModelId = "bert"


@app.get("/health")
def health():
    reg: Registry = app.state.reg
    loaded = reg.available()
    return {
        "status": "ok" if loaded else "no_models",
        "loaded": loaded,
        "names": {m: MODEL_NAMES[m] for m in loaded},
        "errors": reg.errors,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    text = clean(req.text)
    reg = require(req.model)
    results = {m: summarize(reg.probs(m, [text])[0]) for m in reg.available()}
    primary = results[req.model]
    return {
        "text": text,
        "primary": req.model,
        "results": results,
        "flags": {
            "low_confidence": primary["confidence"] < LOW_CONFIDENCE,
            "models_disagree": len({r["label"] for r in results.values()}) > 1,
            "informal": bool(INFORMAL.search(text)),
        },
    }


@app.post("/explain")
def explain(req: ExplainRequest):
    """Leave-one-word-out. score = P(predicted class) - P(predicted class | word removed).
    Positive: the word supports the prediction. Negative: it pushes against it."""
    text = clean(req.text)
    reg = require(req.model)
    words = text.split(" ")
    if len(words) > MAX_EXPLAIN_WORDS:
        raise HTTPException(422, f"Too long to explain (max {MAX_EXPLAIN_WORDS} words).")

    base = reg.probs(req.model, [text])[0]
    cls = int(np.argmax(base))
    variants = [" ".join(words[:i] + words[i + 1 :]) for i in range(len(words))]
    drops = base[cls] - reg.probs(req.model, variants)[:, cls]

    return {
        "model": req.model,
        "label": LABELS[cls],
        "confidence": float(base[cls]),
        "words": [{"word": w, "score": float(s)} for w, s in zip(words, drops)],
    }


@app.post("/batch")
def batch(file: UploadFile = File(...), model: ModelId = Query("bert")):
    reg = require(model)
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 1 MB).")
    try:
        rows = list(csv.reader(io.StringIO(raw.decode("utf-8-sig"))))
    except UnicodeDecodeError:
        raise HTTPException(422, "CSV must be UTF-8 encoded.")
    if not rows:
        raise HTTPException(422, "The CSV is empty.")

    header = [h.strip().lower() for h in rows[0]]
    col = next((header.index(c) for c in ("text", "sentence") if c in header), None)
    body = rows[1:] if col is not None else rows  # no header: first column, keep row 1
    col = col or 0

    texts = [re.sub(r"\s+", " ", r[col]).strip()[:MAX_CHARS] for r in body if len(r) > col and r[col].strip()]
    if not texts:
        raise HTTPException(422, "No text found. Use a column named 'text'.")
    if len(texts) > MAX_BATCH:
        raise HTTPException(422, f"Too many rows (max {MAX_BATCH}).")

    probs = reg.probs(model, texts)
    return {
        "model": model,
        "count": len(texts),
        "rows": [{"text": t, **summarize(p)} for t, p in zip(texts, probs)],
    }
# ---------------------------------------------------------------- article
# Split after . ! ? when the next sentence starts with a capital letter, digit or quote.
# Decimals like "13.1" never split because there is no whitespace after the dot.
SENTENCE_SPLIT = re.compile(
    r"""(?:(?<=[.!?])|(?<=[.!?]["\u201d')]))\s+(?=["\u201c'(]*[A-Z0-9])"""
)


def split_sentences(text: str) -> list[str]:
    paragraphs = [p for p in re.split(r"\n\s*\n|\r?\n", text) if p.strip()]
    out: list[str] = []
    for para in paragraphs:
        para = re.sub(r"\s+", " ", para).strip()
        out.extend(s.strip() for s in SENTENCE_SPLIT.split(para))
    return [s[:MAX_CHARS] for s in out if len(s) >= 3]


class AnalyzeRequest(BaseModel):
    text: str
    model: ModelId = "bert"


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Score every sentence of an article with one model and summarise the tone.
    score = mean(P(positive) - P(negative)) over sentences, in [-1, 1]."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(422, "Please paste some text.")
    if len(text) > MAX_ANALYZE_CHARS:
        raise HTTPException(422, f"Text is too long (max {MAX_ANALYZE_CHARS} characters).")
    reg = require(req.model)

    sentences = split_sentences(text)
    if not sentences:
        raise HTTPException(422, "No sentences found.")
    if len(sentences) > MAX_SENTENCES:
        raise HTTPException(422, f"Too many sentences (max {MAX_SENTENCES}).")

    probs = reg.probs(req.model, sentences)
    rows = [{"text": t, **summarize(p)} for t, p in zip(sentences, probs)]
    margins = probs[:, 2] - probs[:, 0]  # positive minus negative
    score = float(margins.mean())

    counts = {l: sum(r["label"] == l for r in rows) for l in LABELS}
    order = np.argsort(margins)
    top_negative = [int(i) for i in order[:3] if margins[i] < 0]
    top_positive = [int(i) for i in order[::-1][:3] if margins[i] > 0]

    if score > TONE_THRESHOLD:
        tone = "positive"
    elif score < -TONE_THRESHOLD:
        tone = "negative"
    else:
        tone = "neutral"

    return {
        "model": req.model,
        "count": len(rows),
        "score": score,
        "tone": tone,
        "counts": counts,
        "top_positive": top_positive,
        "top_negative": top_negative,
        "sentences": rows,
    }