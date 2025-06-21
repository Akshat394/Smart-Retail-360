#!/bin/bash

echo "🚀 Starting SmartRetail360 services..."

# Start all services
docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 60

# Create Kafka topics
echo "📊 Creating Kafka topics..."
./scripts/create-kafka-topics.sh

# Generate sample data
echo "📁 Generating sample data..."
./scripts/generate-sample-data.sh

echo "✅ All services started successfully!"
echo ""
echo "🌐 Access points:"
echo "- Dashboard: http://localhost:3000"
echo "- API Documentation: http://localhost:8000/docs"
echo "- Spark UI: http://localhost:8080"
echo "- Hadoop NameNode: http://localhost:9870"
echo "- HBase Master: http://localhost:16010"