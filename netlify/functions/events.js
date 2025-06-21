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
    const eventTypes = [
      'order_placed',
      'shipment_dispatched', 
      'delivery_completed',
      'inventory_updated',
      'anomaly_detected',
      'route_optimized',
      'forecast_updated',
      'alert_triggered'
    ];

    const locations = [
      'Warehouse A - NYC',
      'Distribution Center - Boston', 
      'Store 123 - Philadelphia',
      'Route NE-42',
      'Fulfillment Center - Newark',
      'Customer Location - Manhattan'
    ];

    const severityLevels = ['low', 'medium', 'high', 'critical'];

    // Generate realistic recent events
    const events = Array.from({ length: 25 }, (_, i) => {
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
      
      return {
        id: `EVT-${String(1000 + i).padStart(4, '0')}`,
        type: eventType,
        timestamp: timestamp.toISOString(),
        description: generateEventDescription(eventType),
        severity,
        location: locations[Math.floor(Math.random() * locations.length)],
        metadata: {
          user_id: `USER-${Math.floor(Math.random() * 1000)}`,
          session_id: `SES-${Math.floor(Math.random() * 10000)}`,
          correlation_id: `COR-${Math.floor(Math.random() * 100000)}`
        }
      };
    });

    // Sort by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        events,
        total_count: events.length,
        last_updated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error in events function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

function generateEventDescription(eventType) {
  const descriptions = {
    order_placed: 'New order received from customer',
    shipment_dispatched: 'Package dispatched from fulfillment center',
    delivery_completed: 'Successful delivery to customer location',
    inventory_updated: 'Stock levels updated in warehouse system',
    anomaly_detected: 'Unusual pattern detected in demand forecast',
    route_optimized: 'Delivery route recalculated for efficiency',
    forecast_updated: 'ML model predictions refreshed',
    alert_triggered: 'System alert activated for threshold breach'
  };
  
  return descriptions[eventType] || 'System event occurred';
}