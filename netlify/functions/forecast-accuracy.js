const { MongoClient } = require('mongodb');

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
    // Mock data for demo - in production, connect to your database
    const forecastData = {
      overall_mape: Math.round((Math.random() * 3 + 5) * 100) / 100,
      models: {
        arima: {
          mape: 8.4,
          rmse: 142.3,
          r2: 0.89,
          last_updated: new Date().toISOString()
        },
        lstm: {
          mape: 6.2,
          rmse: 128.9,
          r2: 0.92,
          last_updated: new Date().toISOString()
        },
        ensemble: {
          mape: 5.8,
          rmse: 118.6,
          r2: 0.94,
          last_updated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(forecastData),
    };
  } catch (error) {
    console.error('Error in forecast-accuracy function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};