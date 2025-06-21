# SmartRetail360 - Next-Gen Supply Chain Orchestrator

A comprehensive supply chain orchestration platform built with Apache Spark, Hadoop, Kafka, and modern ML techniques for demand forecasting, route optimization, and real-time inventory management.

## 🚀 Features

### Infrastructure & Data Processing
- **Apache Hadoop 3.x** - Distributed storage and processing (HDFS + YARN)
- **Apache Kafka** - Real-time event streaming for orders, traffic, and delivery events
- **HBase** - NoSQL database for real-time data storage
- **MongoDB** - Document storage for event logging and analytics
- **Apache Spark** - Real-time streaming and batch processing

### AI/ML Capabilities
- **Demand Forecasting** - ARIMA and LSTM models for SKU demand prediction
- **Anomaly Detection** - Real-time detection of supply chain disruptions
- **Route Optimization** - GraphX-based shortest path calculation with live traffic
- **Digital Twin Simulator** - What-if scenario analysis for supply chain planning

### Smart Contracts & Automation
- **Hyperledger Fabric** - Blockchain-based smart contracts for supplier agreements
- **Automated Rebalancing** - AI-driven inventory redistribution
- **SLA Monitoring** - Real-time contract compliance tracking

### Real-Time Dashboard
- **Live KPI Monitoring** - Forecast accuracy, delivery performance, CO₂ emissions
- **Interactive Maps** - Real-time route visualization with traffic updates
- **Explainable AI** - SHAP-based model interpretability
- **Event Timeline** - Complete audit trail of supply chain events

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │   Processing    │    │    Storage      │
│                 │    │                 │    │                 │
│ • POS Systems   │───▶│ • Apache Kafka  │───▶│ • HDFS          │
│ • Traffic APIs  │    │ • Spark Stream  │    │ • HBase         │
│ • IoT Sensors   │    │ • MapReduce     │    │ • MongoDB       │
│ • Suppliers     │    │ • ML Pipelines  │    │ • Redis Cache   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SmartRetail360 Dashboard                     │
│                                                                 │
│ • Real-time KPIs      • Route Optimization                     │
│ • Demand Forecasts    • Smart Contract Status                  │
│ • Digital Twin        • Event Monitoring                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM
- 20GB+ free disk space

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smartretail360.git
   cd smartretail360
   ```

2. **Initialize the environment**
   ```bash
   chmod +x scripts/*.sh
   ./scripts/setup.sh
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the dashboard**
   - Frontend: http://localhost:3000
   - Spark UI: http://localhost:8080
   - Hadoop NameNode: http://localhost:9870
   - HBase Master: http://localhost:16010
   - API Docs: http://localhost:8000/docs

### Data Loading

The system includes automated data generators that create realistic supply chain events:

```bash
# Generate sample POS data
./scripts/generate-pos-data.sh

# Start streaming data generators
./scripts/start-data-streams.sh

# Load historical data for ML training
./scripts/load-historical-data.sh
```

## 📊 Dashboard Features

### KPI Monitoring
- **Forecast Accuracy**: Real-time MAPE scores for demand predictions
- **Delivery Performance**: On-time delivery percentage and SLA compliance
- **Carbon Footprint**: CO₂ emissions tracking and optimization recommendations
- **Inventory Turnover**: Stock rotation efficiency across warehouses

### Digital Twin Simulator
- **Demand Spike Simulation**: Model impact of promotional events
- **Weather Event Impact**: Assess supply chain disruption scenarios  
- **Supplier Outage**: Test resilience and alternative sourcing
- **Peak Season Planning**: Optimize inventory for seasonal demand

### Route Optimization
- **Live Traffic Integration**: Real-time route recalculation
- **Multi-modal Transportation**: Optimize across truck, rail, and air
- **Carbon-Efficient Routing**: Balance speed vs. environmental impact
- **Delivery Clustering**: Geographic optimization for last-mile efficiency

## 🔧 Development

### Running Individual Components

**Kafka Producers/Consumers**
```bash
# Start order stream producer
python services/data-generator/producers/order_producer.py

# Start delivery event consumer
python services/data-generator/consumers/delivery_consumer.py
```

**Spark Jobs**
```bash
# Submit demand forecasting job
./scripts/submit-spark-job.sh forecast_demand

# Submit route optimization job  
./scripts/submit-spark-job.sh optimize_routes
```

**API Testing**
```bash
# Test forecast accuracy endpoint
curl http://localhost:8000/metrics/forecast_accuracy

# Test route optimization
curl "http://localhost:8000/routes/DEL-001?mode=fastest"
```

### ML Model Training

```bash
# Train ARIMA models
jupyter notebook notebooks/demand_forecasting.ipynb

# Train LSTM models
python ml/train_lstm.py --data_path /data/historical_sales.csv

# Deploy models to Spark
./scripts/deploy-ml-models.sh
```

## 🧪 Testing

### Unit Tests
```bash
# Test data processing functions
python -m pytest tests/test_data_processing.py

# Test ML models
python -m pytest tests/test_ml_models.py
```

### Integration Tests
```bash
# Test end-to-end data flow
./scripts/test-data-pipeline.sh

# Test API endpoints
python -m pytest tests/test_api.py
```

### Load Testing
```bash
# Generate high-volume test data
./scripts/load-test.sh --events-per-second=1000 --duration=300
```

## 📝 Configuration

### Environment Variables
```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPICS=orders,traffic,delivery_events

# Database Connections
MONGODB_URL=mongodb://admin:smartretail2024@localhost:27017
HBASE_HOST=localhost
REDIS_URL=redis://localhost:6379

# ML Model Settings
MODEL_UPDATE_FREQUENCY=3600  # seconds
FORECAST_HORIZON=30          # days
ANOMALY_THRESHOLD=2.5        # standard deviations
```

### Scaling Configuration
```bash
# Adjust in docker-compose.yml
SPARK_WORKER_CORES=4
SPARK_WORKER_MEMORY=4G
KAFKA_NUM_PARTITIONS=6
HBASE_REGION_SERVERS=2
```

## 🔒 Security

- **Network Isolation**: All services run in isolated Docker network
- **Authentication**: JWT-based API authentication
- **Encryption**: TLS encryption for inter-service communication
- **Audit Logging**: Complete event trail in MongoDB
- **Access Control**: Role-based permissions for dashboard features

## 🚀 Production Deployment

### Kubernetes Deployment
```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/

# Scale workers
kubectl scale deployment spark-worker --replicas=5
```

### Monitoring & Alerting
- **Prometheus**: Metrics collection from all services
- **Grafana**: Advanced dashboards and alerting
- **ELK Stack**: Centralized logging and analysis
- **PagerDuty**: Critical alert routing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.smartretail360.com](https://docs.smartretail360.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/smartretail360/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/smartretail360/discussions)
- **Slack**: [SmartRetail360 Community](https://smartretail360.slack.com)

---

**SmartRetail360** - Orchestrating the future of supply chain management 🚛📊🤖