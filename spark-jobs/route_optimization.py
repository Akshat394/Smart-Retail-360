from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
from pyspark.graphx import *
import math

def create_spark_session():
    """Create Spark session for GraphX operations"""
    return SparkSession.builder \
        .appName("SmartRetail360-RouteOptimization") \
        .config("spark.sql.adaptive.enabled", "true") \
        .getOrCreate()

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate haversine distance between two points"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def load_delivery_locations(spark):
    """Load delivery locations from HDFS"""
    # Sample delivery locations
    locations_data = [
        (1, "Warehouse", 40.7128, -74.0060, 0),  # Start point
        (2, "Customer A", 40.7589, -73.9851, 1),
        (3, "Customer B", 40.6782, -73.9442, 1),
        (4, "Customer C", 40.6892, -74.0445, 1),
        (5, "Customer D", 40.7282, -73.9942, 1),
    ]
    
    schema = StructType([
        StructField("location_id", IntegerType(), True),
        StructField("name", StringType(), True),
        StructField("latitude", DoubleType(), True),
        StructField("longitude", DoubleType(), True),
        StructField("is_customer", IntegerType(), True)
    ])
    
    return spark.createDataFrame(locations_data, schema)

def create_distance_matrix(locations_df):
    """Create distance matrix between all locations"""
    locations = locations_df.collect()
    edges = []
    
    for i, loc1 in enumerate(locations):
        for j, loc2 in enumerate(locations):
            if i != j:
                distance = haversine_distance(
                    loc1.latitude, loc1.longitude,
                    loc2.latitude, loc2.longitude
                )
                edges.append((loc1.location_id, loc2.location_id, distance))
    
    return edges

def optimize_route_greedy(locations_df, start_location_id=1):
    """Simple greedy route optimization"""
    locations = locations_df.collect()
    edges = create_distance_matrix(locations_df)
    
    # Create distance lookup
    distance_lookup = {}
    for src, dst, dist in edges:
        distance_lookup[(src, dst)] = dist
    
    # Greedy nearest neighbor algorithm
    unvisited = [loc.location_id for loc in locations if loc.is_customer == 1]
    current = start_location_id
    route = [current]
    total_distance = 0
    
    while unvisited:
        nearest = min(unvisited, key=lambda x: distance_lookup.get((current, x), float('inf')))
        total_distance += distance_lookup.get((current, nearest), 0)
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    
    # Return to start
    total_distance += distance_lookup.get((current, start_location_id), 0)
    route.append(start_location_id)
    
    return route, total_distance

def calculate_route_metrics(route, total_distance):
    """Calculate route performance metrics"""
    # Estimate fuel consumption (L/100km)
    fuel_efficiency = 8.5  # L/100km for delivery truck
    fuel_consumed = (total_distance * fuel_efficiency) / 100
    
    # Estimate CO2 emissions (kg CO2/L diesel)
    co2_per_liter = 2.68
    co2_emissions = fuel_consumed * co2_per_liter
    
    # Estimate time (assuming average speed of 40 km/h in city)
    estimated_time = total_distance / 40 * 60  # minutes
    
    return {
        "total_distance_km": round(total_distance, 2),
        "fuel_consumed_liters": round(fuel_consumed, 2),
        "co2_emissions_kg": round(co2_emissions, 2),
        "estimated_time_minutes": round(estimated_time, 2),
        "stops": len(route) - 2  # Exclude start and return
    }

def save_optimized_route(spark, route, metrics):
    """Save optimized route to HBase"""
    route_data = {
        "route_id": f"RT-{hash(str(route)) % 10000:04d}",
        "waypoints": route,
        "metrics": metrics,
        "optimization_algorithm": "greedy_nearest_neighbor",
        "timestamp": str(datetime.now())
    }
    
    print(f"Optimized Route: {route_data}")
    
    # In real implementation, save to HBase
    # hbase_table.put(route_id, route_data)

def apply_traffic_optimization(spark, base_route, traffic_data):
    """Apply real-time traffic data to optimize routes"""
    # Simulate traffic impact
    traffic_multipliers = {
        "low": 1.0,
        "medium": 1.3,
        "high": 1.8,
        "severe": 2.5
    }
    
    # In real implementation, this would read from Kafka traffic stream
    # and update edge weights in the graph
    
    print("🚦 Applying real-time traffic optimization...")
    return base_route

def main():
    """Main route optimization pipeline"""
    spark = create_spark_session()
    
    try:
        print("🗺️ Starting route optimization pipeline...")
        
        # Load delivery locations
        locations_df = load_delivery_locations(spark)
        locations_df.show()
        
        # Optimize route
        route, total_distance = optimize_route_greedy(locations_df)
        
        # Calculate metrics
        metrics = calculate_route_metrics(route, total_distance)
        
        # Apply traffic optimization
        optimized_route = apply_traffic_optimization(spark, route, None)
        
        # Save results
        save_optimized_route(spark, optimized_route, metrics)
        
        print(f"✅ Route optimization completed!")
        print(f"📍 Route: {' -> '.join(map(str, route))}")
        print(f"📏 Total Distance: {metrics['total_distance_km']} km")
        print(f"⏱️ Estimated Time: {metrics['estimated_time_minutes']} minutes")
        print(f"⛽ Fuel Consumption: {metrics['fuel_consumed_liters']} L")
        print(f"🌱 CO2 Emissions: {metrics['co2_emissions_kg']} kg")
        
    except Exception as e:
        print(f"❌ Error in route optimization pipeline: {e}")
        raise
    finally:
        spark.stop()

if __name__ == "__main__":
    from datetime import datetime
    main()