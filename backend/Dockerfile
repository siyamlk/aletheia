FROM python:3.11-slim
WORKDIR /app

# CPU-only PyTorch keeps the image much smaller
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt requirements-bilstm.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Build with --build-arg WITH_BILSTM=1 to serve the BiLSTM too
ARG WITH_BILSTM=0
RUN if [ "$WITH_BILSTM" = "1" ]; then pip install --no-cache-dir -r requirements-bilstm.txt; fi

COPY app.py .
COPY models ./models

ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
