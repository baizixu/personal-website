FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway provides /data as persistent volume
RUN mkdir -p /data

# Expose port (Railway/Render use PORT env var)
EXPOSE 8000

# Start server
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
