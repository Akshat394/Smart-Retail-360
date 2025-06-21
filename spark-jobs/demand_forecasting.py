from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.regression import LinearRegression
from pyspark.ml.evaluation import RegressionEvaluator
import json

def create_spark_session():
    """Create Spark session with HBase and Kafka support"""
    return SparkSession.builder \
        .appName("SmartRetail360-DemandForecasting") \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
        .getOrCreate()

def load_historical_data(spark):
    """Load historical sales data from HDFS"""
    # In a real implementation, this would read from HDFS
    # For demo, we'll create sample data
    schema = StructType([
        StructField("date", DateType(), True),
        StructField("sku", StringType(), True),
        StructField("quantity", IntegerType(), True),
        StructField("price", DoubleType(), True),
        StructField("category", StringType(), True),
        StructField("store_id", StringType(), True)
    ])
    
    # Sample data
    sample_data = [
        ("2024-01-01", "SKU-1001", 100, 29.99, "Electronics", "ST001"),
        ("2024-01-02", "SKU-1001", 120, 29.99, "Electronics", "ST001"),
        ("2024-01-03", "SKU-1001", 95, 29.99, "Electronics", "ST001"),
        ("2024-01-04", "SKU-1001", 140, 29.99, "Electronics", "ST001"),
        ("2024-01-05", "SKU-1001", 110, 29.99, "Electronics", "ST001"),
    ]
    
    return spark.createDataFrame(sample_data, schema)

def prepare_features(df):
    """Prepare features for ML model"""
    # Add time-based features
    df = df.withColumn("day_of_week", dayofweek("date")) \
           .withColumn("month", month("date")) \
           .withColumn("day_of_month", dayofmonth("date"))
    
    # Create lag features (previous day sales)
    window_spec = Window.partitionBy("sku").orderBy("date")
    df = df.withColumn("prev_day_sales", lag("quantity", 1).over(window_spec))
    
    # Fill null values
    df = df.fillna({"prev_day_sales": 0})
    
    return df

def train_demand_model(df):
    """Train demand forecasting model"""
    # Prepare feature vector
    feature_cols = ["day_of_week", "month", "day_of_month", "prev_day_sales", "price"]
    assembler = VectorAssembler(inputCols=feature_cols, outputCol="features")
    df_features = assembler.transform(df)
    
    # Split data
    train_df, test_df = df_features.randomSplit([0.8, 0.2], seed=42)
    
    # Train model
    lr = LinearRegression(featuresCol="features", labelCol="quantity")
    model = lr.fit(train_df)
    
    # Evaluate model
    predictions = model.transform(test_df)
    evaluator = RegressionEvaluator(labelCol="quantity", predictionCol="prediction", metricName="rmse")
    rmse = evaluator.evaluate(predictions)
    
    print(f"Model RMSE: {rmse}")
    
    return model, rmse

def save_model_to_hbase(model, rmse):
    """Save model metadata to HBase"""
    # In a real implementation, this would save to HBase
    model_info = {
        "model_type": "LinearRegression",
        "rmse": rmse,
        "timestamp": str(datetime.now()),
        "version": "1.0.0"
    }
    
    print(f"Model saved: {json.dumps(model_info, indent=2)}")

def main():
    """Main forecasting pipeline"""
    spark = create_spark_session()
    
    try:
        print("🔮 Starting demand forecasting pipeline...")
        
        # Load and prepare data
        df = load_historical_data(spark)
        df_features = prepare_features(df)
        
        # Train model
        model, rmse = train_demand_model(df_features)
        
        # Save model
        save_model_to_hbase(model, rmse)
        
        print("✅ Demand forecasting pipeline completed successfully!")
        
    except Exception as e:
        print(f"❌ Error in demand forecasting pipeline: {e}")
        raise
    finally:
        spark.stop()

if __name__ == "__main__":
    from datetime import datetime
    main()