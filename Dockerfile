FROM python:3.11-slim

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user required by Hugging Face Spaces (UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install python dependencies
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy application source
COPY --chown=user:user . .

# Hugging Face Spaces exposes port 7860
ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
