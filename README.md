# Aletheia

### Uncovering the sentiment behind financial language.

Aletheia is an end-to-end financial sentiment analysis system built to explore how machine learning and deep learning models interpret the language of financial markets.

It classifies financial text into three sentiment categories: **Negative, Neutral, and Positive**, bringing together traditional machine learning, recurrent neural networks, and transformer-based NLP in one interactive application.

The project was built around a question:

*How well can different machine learning architectures understand the subtle language used in financial communication, and how reliably do they generalise beyond the data they were trained on?*

That question became Aletheia.

---

## The Idea

Financial language is rarely as straightforward as it appears.

A statement about declining revenue, changing forecasts, or improving market conditions can carry different implications depending on its context. General-purpose sentiment analysis systems may overlook these nuances.

I wanted to explore this problem by building a system that did more than produce a sentiment label. I wanted to compare different modelling approaches, understand where they succeed and fail, and make their predictions accessible through an interactive application.

Aletheia brings together three different approaches:

- Traditional machine learning using TF-IDF and Logistic Regression.
- Sequential deep learning using a Bidirectional LSTM with Attention.
- Transformer-based classification using fine-tuned BERT.

Rather than assuming that a more complex architecture is automatically better, the project evaluates each model using a consistent experimental setup.

## What Aletheia Grew Into

What started as an exploration of financial NLP gradually developed into a complete application combining model experimentation, evaluation, backend engineering, and frontend development.

Today, Aletheia includes:

- [x] Three independently trained sentiment classification models.
- [x] A comparative model evaluation pipeline.
- [x] Multi-seed BERT experiments.
- [x] External evaluation on a separate financial Twitter dataset.
- [x] An interactive React application.
- [x] A FastAPI backend serving model predictions.
- [x] Sentence-level and batch analysis workflows.
- [x] Word influence visualisation and model reporting.

The objective was not simply to achieve a high accuracy score, but to understand what those scores actually represent.

---

## Understanding Financial Sentiment

Aletheia uses the Financial PhraseBank dataset, specifically the `sentences_75agree` subset.

The dataset contains 3,448 unique financial sentences annotated with three sentiment labels.

| Label    | Meaning                                                                       |
| -------- | ----------------------------------------------------------------------------- |
| Negative | Financial language expressing unfavourable sentiment                          |
| Neutral  | Financial language expressing neither clearly positive nor negative sentiment |
| Positive | Financial language expressing favourable sentiment                            |

The dataset was divided using stratified sampling:

| Split      |   Samples |
| ---------- | --------: |
| Training   |     2,413 |
| Validation |       517 |
| Testing    |       518 |
| **Total**  | **3,448** |

Stratification was used to preserve class distributions across the three subsets.

## The Models

One of the central parts of Aletheia was comparing models with fundamentally different approaches to understanding text.

### 1. TF-IDF + Logistic Regression

The traditional machine learning baseline.

The pipeline uses TF-IDF feature extraction with unigrams and bigrams, followed by Logistic Regression with balanced class weights.

Configuration highlights:

- Maximum vocabulary size: 10,000 features.
- N-gram range: (1, 2).
- Minimum document frequency: 2.
- Sublinear TF scaling.
- Balanced class weights.

This model provides a relatively lightweight baseline against which more complex architectures can be evaluated.

### 2. BiLSTM with Attention

The sequential deep learning approach.

The architecture combines:

- Tokenisation and sequence padding.
- A trainable embedding layer.
- Bidirectional LSTM layers.
- A custom attention mechanism.
- Dropout regularisation.
- A three-class softmax output layer.

The attention mechanism allows the network to assign different importance to different parts of an input sequence when producing its representation.

### 3. Fine-tuned BERT

The transformer-based approach.

A general-purpose `google-bert/bert-base-uncased` model was fine-tuned for three-class financial sentiment classification.

Configuration highlights:

- Maximum sequence length: 128.
- Training batch size: 16.
- Optimiser: AdamW.
- Learning rate: 2e-5.
- Weight decay: 0.01.
- Linear learning-rate scheduling with warmup.
- Validation-loss-based checkpoint selection.
- Early stopping.

The experiment was repeated across three random seeds to examine the consistency of model performance.

## Model Comparison

The models were evaluated on the held-out Financial PhraseBank test set.

| Model                        | Accuracy | Macro F1 |
| ---------------------------- | -------: | -------: |
| TF-IDF + Logistic Regression |   84.75% |    0.805 |
| BiLSTM + Attention           |   83.01% |    0.775 |
| Fine-tuned BERT              | 92.99%\* |  0.913\* |

*BERT figures represent mean performance across three random seeds.*

BERT achieved the strongest results among the three approaches, while the traditional Logistic Regression baseline remained competitive despite its substantially simpler architecture.

Macro F1 was included alongside accuracy to account for class imbalance and provide a more balanced view of classification performance.

---

## Beyond the Test Set: External Evaluation

High performance on a held-out test set does not necessarily mean a model will perform equally well on data from a different source.

To investigate this, I evaluated the fine-tuned BERT model on a separate financial Twitter sentiment dataset.

The external evaluation used 2,388 samples.

| Metric   | Result |
| -------- | -----: |
| Accuracy | 74.83% |
| Macro F1 |  0.663 |

The reduction in performance highlights the challenges of domain generalisation.

Financial news sentences and financial social-media posts differ in vocabulary, sentence structure, writing style, and how sentiment is expressed.

The experiment also included error analysis, with particular attention to confusion between neutral and positive predictions.

This was an important part of the project: evaluating not only how well a model performs on familiar data, but also where its assumptions begin to break down.

---

## Living in the Application

I wanted the models to be accessible beyond a Jupyter notebook.

Aletheia uses a React frontend connected to a FastAPI backend, allowing users to interact with the trained models through a single interface.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/dashboard.png", label: "", pos: "b", w: 1808, h: 667, constraint: "off" }
```
<p align="center">
  <sub><em>Aletheia: An interactive financial sentiment analysis platform.</em></sub>
</p>

The application currently includes:

### Sentence Lab

Analyse individual financial sentences and inspect their predicted sentiment.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/sentence-lab.png", label: "", pos: "b", w: 1821, h: 792, constraint: "off" }
```
<p align="center">
  <sub><em>Sentence Lab: Analysing individual financial statements.</em></sub>
</p>

### Word Influence

Explore word-level influence within a prediction to better understand how the input contributes to the output.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/word-influence.png", label: "", pos: "b", w: 1097, h: 112, constraint: "off" }
```
<p align="center">
  <sub><em>Word Influence: Exploring the contribution of individual words to a prediction.</em></sub>
</p>

### Batch Analysis

Process multiple financial sentences together rather than analysing them individually.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/batch-analysis.png", label: "", pos: "b", w: 957, h: 555, constraint: "off" }
```
<p align="center">
  <sub><em>Batch Analysis: Processing multiple financial sentences together.</em></sub>
</p>

### Article Scanner

Explore sentiment across longer financial text.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/article-scanner.png", label: "", pos: "b", w: 1797, h: 797, constraint: "off" }
```
<p align="center">
  <sub><em>Article Scanner: Analysing sentiment across longer financial text.</em></sub>
</p>

### Model Report

Review model performance and compare the different approaches used in the project.

```mermaid
flowchart LR
  A@{ img: "https://raw.githubusercontent.com/siyamlk/aletheia/main/screenshots/model-report.png", label: "", pos: "b", w: 1840, h: 738, constraint: "off" }
```
<p align="center">
  <sub><em>Model Report: Comparing model performance and evaluation results.</em></sub>
</p>

---

## Under the Hood

Aletheia separates the user interface, API layer, and model inference components.

At a high level, the architecture looks like this:

```text
                 React + TypeScript
                         |
                  User Interface
                         |
                    FastAPI
                         |
                 Model Inference
                         |
          +--------------+--------------+
          |              |              |
       BERT           BiLSTM       TF-IDF + LR
          |              |              |
          +--------------+--------------+
                         |
                Sentiment Prediction
                         |
                 Frontend Response
```

Each component has a separate responsibility.

- **Frontend:** Handles user interaction, text submission, and result visualisation.
- **FastAPI:** Exposes the inference functionality through REST endpoints.
- **Model layer:** Loads the trained models and generates sentiment predictions.
- **Evaluation layer:** Supports comparative analysis and model performance reporting.

Keeping these components separate makes it easier to maintain the application and experiment with individual models without redesigning the entire system.

## Technology Stack

| Area             | Technologies                           |
| ---------------- | -------------------------------------- |
| Frontend         | React, TypeScript, Vite                |
| Backend          | Python, FastAPI                        |
| Traditional ML   | Scikit-learn                           |
| Deep Learning    | TensorFlow, Keras, PyTorch             |
| NLP              | Hugging Face Transformers              |
| Data Processing  | NumPy, Pandas                          |
| Model Evaluation | Accuracy, Macro F1, Confusion Matrices |
| Development      | Git, REST APIs                         |

---

## Project Structure

The repository is organised to keep the frontend, backend, model artifacts, and experimental notebooks separate.

```text
aletheia/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .dockerignore
│   │
│   └── models/
│       ├── aletheia_bert/
│       ├── aletheia_bilstm.keras
│       ├── aletheia_logistic_regression.joblib
│       └── aletheia_tokenizer.pkl
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── index.html
│
├── notebooks/
│   └── Aletheia.ipynb
│
├── .gitignore
└── README.md
```

The trained model artifacts are distributed separately through Hugging Face rather than requiring users to clone large model files directly from GitHub.

---

## Getting Started

### Prerequisites

Before running Aletheia locally, make sure you have:

- Python installed.
- Node.js and npm.
- Git.
- Access to the model files hosted on Hugging Face.

### 1. Clone the Repository

```bash
git clone https://github.com/siyamlk/aletheia.git
cd aletheia
```

### 2. Download the Model Files

The trained model artifacts are hosted separately on Hugging Face to keep the GitHub repository lightweight.

Install the Hugging Face CLI:

```bash
pip install -U huggingface_hub
```

Download the model files directly into the backend models directory:

```bash
hf download siya2005/aletheia-models \
    --local-dir backend/models
```

The downloaded directory should have the following structure:

```text
backend/
└── models/
    ├── aletheia_bert/
    │   ├── config.json
    │   ├── model.safetensors
    │   ├── tokenizer.json
    │   ├── tokenizer_config.json
    │   └── ...
    │
    ├── aletheia_bilstm.keras
    ├── aletheia_logistic_regression.joblib
    └── aletheia_tokenizer.pkl
```

The BERT directory should contain the configuration, model weights, and tokenizer files required by the backend.

If the Hugging Face repository is private or gated, authenticate first:

```bash
hf auth login
```

Then run the download command again.

**Important:** The Hugging Face repository must preserve the expected model filenames and directory structure. The backend expects these artifacts at their corresponding paths inside `backend/models/`.

### 3. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it.

**Windows:**

```powershell
.\venv\Scripts\Activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app:app --reload --port 8000
```

The API will be available at:

- API: `http://localhost:8000`
- Interactive documentation: `http://localhost:8000/docs`

### 4. Set Up the Frontend

Open a second terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the application at:

`http://localhost:5173`

Keep both the frontend and backend servers running while using the application.

Make sure the frontend API configuration points to the correct backend URL.

---

## Engineering Trade-offs

Every model and system design involves trade-offs. Aletheia explores some of these through its experiments and implementation.

### Model Complexity

BERT achieved stronger in-domain performance than the traditional baseline, but it also requires more computational resources.

Logistic Regression remains a lightweight alternative, while BiLSTM provides an intermediate approach using learned sequential representations.

### Generalisation

The external evaluation revealed a noticeable performance gap between the original test set and a separate financial Twitter dataset.

This demonstrates why evaluation on a single dataset is not enough to establish real-world reliability.

### Interpretability

Aletheia includes word-level influence visualisation to make predictions easier to inspect.

These visualisations should be treated as explanatory aids rather than definitive proof of causal relationships between individual words and model decisions.

### Model Distribution

The model artifacts are hosted separately from the source code to avoid unnecessarily large GitHub repositories and make model retrieval an explicit part of setup.

---

## Where It's Going

Aletheia is an evolving project. There are several directions I would like to explore as I continue improving it.

### Current

- [x] Three-class financial sentiment classification.
- [x] Comparison of traditional ML, BiLSTM, and BERT.
- [x] Three-seed BERT experiments.
- [x] External dataset evaluation.
- [x] Interactive React application.
- [x] FastAPI model-serving layer.
- [x] Sentence and batch analysis.
- [x] Word influence visualisation.

### Exploring Next

- [ ] Better handling of negation and contextual sentiment.
- [ ] Evaluation on additional financial datasets.
- [ ] Domain-adapted transformer architectures.
- [ ] More detailed error analysis and explainability.
- [ ] Improved inference efficiency.
- [ ] Production deployment and monitoring.
- [ ] Expanded model comparison and reporting.

---

## About the Author

Designed and developed by **Siya Malik** as an exploration of financial NLP, machine learning experimentation, and building end-to-end applications.

- GitHub: [github.com/siyamlk](https://github.com/siyamlk)
- LinkedIn: [linkedin.com/in/siya-m-704141219](https://www.linkedin.com/in/siya-m-704141219/)

---

*Aletheia: Uncovering the sentiment behind financial language.*
