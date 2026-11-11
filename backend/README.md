# Aletheia API

FastAPI backend for the Aletheia financial sentiment demo. Serves BERT,
TF-IDF + Logistic Regression and BiLSTM + Attention (any that are present).

## 1. Export the models from Colab

Run after Section 7 of the notebook:

```python
import sklearn, transformers, torch, shutil
print("scikit-learn", sklearn.__version__, "| transformers", transformers.__version__, "| torch", torch.__version__)
try:
    import tensorflow as tf; print("tensorflow", tf.__version__)
except ImportError:
    pass

!mkdir -p models
!cp -r aletheia_bert models/
!cp aletheia_logistic_regression.joblib aletheia_bilstm.keras aletheia_tokenizer.pkl models/
shutil.make_archive("aletheia_models", "zip", "models")
from google.colab import files; files.download("aletheia_models.zip")
```

Unzip into `models/` next to `app.py`:

```
app.py
models/
  aletheia_bert/                       (config.json, model.safetensors, tokenizer files)
  aletheia_logistic_regression.joblib
  aletheia_bilstm.keras                (optional)
  aletheia_tokenizer.pkl               (optional, needed with the BiLSTM)
```

Pin the printed versions in `requirements*.txt`.

## 2. Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-bilstm.txt     # optional
uvicorn app:app --reload --port 8000
```

Docs: http://localhost:8000/docs

```bash
curl localhost:8000/health
curl -X POST localhost:8000/predict -H 'content-type: application/json' \
  -d '{"text":"Operating profit rose to EUR 13.1 million from EUR 8.7 million.","model":"bert"}'
curl -X POST localhost:8000/explain -H 'content-type: application/json' \
  -d '{"text":"Operating profit rose to EUR 13.1 million from EUR 8.7 million.","model":"bert"}'
curl -X POST "localhost:8000/batch?model=logreg" -F file=@sentences.csv
```

## 3. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | loaded models and load errors |
| POST | `/predict` | `{text, model}` -> every loaded model's label/probabilities + flags (`low_confidence`, `models_disagree`, `informal`) |
| POST | `/explain` | `{text, model}` -> per-word signed influence (leave-one-word-out) |
| POST | `/batch?model=` | CSV upload with a `text` column, up to 200 rows |

## 4. Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `MODEL_DIR` | `models` | where the model files live |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | comma-separated; add your Vercel URL |
| `ALLOWED_ORIGIN_REGEX` | unset | e.g. `https://.*\.vercel\.app` for Vercel preview deployments |

## 5. Deploy

BERT-base is ~440 MB on disk and needs roughly 1 GB+ of RAM with PyTorch; TensorFlow
adds more. Check your host's current memory limits before choosing a plan.

**Hugging Face Space (Docker)**: create a Space with SDK = Docker, push this folder
(track `models/` with Git LFS), and add this header to the top of the Space's README:

```
---
title: Aletheia API
sdk: docker
app_port: 7860
---
```

Set `ALLOWED_ORIGINS` in the Space settings. Build with the BiLSTM by adding the
build arg `WITH_BILSTM=1`.

**Render (Docker)**: New Web Service -> this repo -> Runtime: Docker. Set the
environment variables above. Free instances sleep when idle, so the first request
can be slow.

Not production-hardened: there is no authentication or rate limiting, only input
size limits. Add both before exposing it widely. Not for trading or investment decisions.
