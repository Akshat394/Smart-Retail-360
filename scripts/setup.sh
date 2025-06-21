#!/bin/bash

echo "🚀 Setting up SmartRetail360..."

# Create necessary directories
mkdir -p data/{raw,processed,models}
mkdir -p logs
mkdir -p spark-jobs
mkdir -p notebooks

# Set permissions
chmod +x scripts/*.sh

# Create Kafka topics script
cat > scripts/create-kafka-topics.sh << 'EOF'
#!/bin/bash
echo "Creating Kafka topics..."

docker exec kafka kafka-topics --create --topic orders --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
docker exec kafka kafka-topics --create --topic traffic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1  
docker exec kafka kafka-topics --create --topic delivery_events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1

echo "Kafka topics created successfully!"
EOF

chmod +x scripts/create-kafka-topics.sh

# Create sample data generation script
cat > scripts/generate-sample-data.sh << 'EOF'
#!/bin/bash
echo "Generating sample data..."

# Create sample POS data
cat > data/raw/pos_sales.csv << 'POSDATA'
date,store_id,sku,quantity,price,category
2024-01-01,ST001,SKU-1001,5,29.99,Electronics
2024-01-01,ST001,SKU-1002,3,49.99,Clothing
2024-01-01,ST002,SKU-1003,8,19.99,Home
2024-01-02,ST001,SKU-1001,7,29.99,Electronics
2024-01-02,ST003,SKU-1004,2,99.99,Sports
POSDATA

# Create sample supplier data
cat > data/raw/suppliers.json << 'SUPPLIERDATA'
[
  {"supplier_id": "SUP-001", "name": "TechCorp", "category": "Electronics", "lead_time": 7, "reliability": 0.95},
  {"supplier_id": "SUP-002", "name": "FashionPlus", "category": "Clothing", "lead_time": 14, "reliability": 0.88},
  {"supplier_id": "SUP-003", "name": "HomeGoods", "category": "Home", "lead_time": 10, "reliability": 0.92}
]
SUPPLIERDATA

echo "Sample data generated successfully!"
EOF

chmod +x scripts/generate-sample-data.sh

# Create MongoDB initialization script
cat > scripts/mongo-init.js << 'EOF'
db = db.getSiblingDB('smartretail360');

db.createCollection('delivery_events');
db.createCollection('analytics');
db.createCollection('system_logs');

// Create indexes
db.delivery_events.createIndex({ "timestamp": 1 });
db.delivery_events.createIndex({ "delivery_id": 1 });
db.analytics.createIndex({ "date": 1 });

print('MongoDB initialized successfully!');
EOF

echo "✅ SmartRetail360 setup completed!"
echo ""
echo "Next steps:"
echo "1. Run: docker-compose up --build"
echo "2. Wait for all services to start (2-3 minutes)"
echo "3. Run: ./scripts/create-kafka-topics.sh"
echo "4. Access dashboard at: http://localhost:3000"
echo ""
echo "Service URLs:"
echo "- Frontend: http://localhost:3000"
echo "- API: http://localhost:8000"
echo "- Spark UI: http://localhost:8080"
echo "- Hadoop NameNode: http://localhost:9870"
echo "- HBase Master: http://localhost:16010"