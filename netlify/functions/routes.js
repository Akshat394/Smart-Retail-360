const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { delivery_id } = event.queryStringParameters || {};
    const mode = event.queryStringParameters?.mode || 'balanced';

    if (!delivery_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'delivery_id is required' }),
      };
    }

    // Simulate route optimization calculation
    const optimizationSavings = Math.floor(Math.random() * 20 + 15);
    const distance = Math.round((Math.random() * 40 + 20) * 10) / 10;
    const estimatedTime = Math.floor(Math.random() * 60 + 30);
    const fuelCost = Math.round((distance * 0.45) * 100) / 100;
    const co2Emission = Math.round((distance * 0.25) * 10) / 10;

    const routeData = {
      delivery_id,
      mode,
      route: {
        distance: `${distance} km`,
        estimated_time: `${estimatedTime} min`,
        fuel_cost: `$${fuelCost}`,
        co2_emission: `${co2Emission} kg`,
        optimization_savings: `${optimizationSavings}%`
      },
      waypoints: [
        { lat: 40.7128, lng: -74.0060, address: "Distribution Center", type: "origin" },
        { lat: 40.7589, lng: -73.9851, address: "Customer Location 1", type: "stop" },
        { lat: 40.6782, lng: -73.9442, address: "Customer Location 2", type: "stop" },
        { lat: 40.6892, lng: -74.0445, address: "Final Destination", type: "destination" }
      ],
      traffic_conditions: {
        current_delay: Math.floor(Math.random() * 15),
        congestion_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        alternative_routes: Math.floor(Math.random() * 3 + 1)
      },
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(routeData),
    };
  } catch (error) {
    console.error('Error in routes function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};