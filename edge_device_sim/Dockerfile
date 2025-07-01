# Use Python 3.9 Alpine as base image
FROM python:3.9-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev \
    curl \
    && rm -rf /var/cache/apk/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S edgeuser
RUN adduser -S edgeuser -u 1001

# Change ownership
RUN chown -R edgeuser:edgeuser /app
USER edgeuser

# Expose ports
EXPOSE 1883 9001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:9001/health')" || exit 1

# Start the edge device simulator
CMD ["python", "iot_edge_service.py"] 