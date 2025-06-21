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
    // Simulate real-time inventory data
    const totalSkus = 15847;
    const inStockPercentage = Math.floor(Math.random() * 10 + 65);
    const lowStockPercentage = Math.floor(Math.random() * 8 + 18);
    const outOfStockPercentage = Math.floor(Math.random() * 5 + 5);
    const overstockPercentage = 100 - inStockPercentage - lowStockPercentage - outOfStockPercentage;

    const inventoryData = {
      total_skus: totalSkus,
      in_stock: inStockPercentage,
      low_stock: lowStockPercentage,
      out_of_stock: outOfStockPercentage,
      overstock: Math.max(0, overstockPercentage),
      reorder_alerts: Math.floor(Math.random() * 50 + 120),
      last_updated: new Date().toISOString(),
      warehouse_breakdown: [
        {
          warehouse_id: 'WH-001',
          location: 'New York',
          capacity_utilization: Math.floor(Math.random() * 20 + 75),
          active_skus: Math.floor(totalSkus * 0.3)
        },
        {
          warehouse_id: 'WH-002', 
          location: 'Boston',
          capacity_utilization: Math.floor(Math.random() * 20 + 70),
          active_skus: Math.floor(totalSkus * 0.25)
        },
        {
          warehouse_id: 'WH-003',
          location: 'Philadelphia', 
          capacity_utilization: Math.floor(Math.random() * 20 + 80),
          active_skus: Math.floor(totalSkus * 0.45)
        }
      ],
      top_alerts: [
        {
          sku: 'SKU-1847',
          product_name: 'Wireless Headphones Pro',
          current_stock: 12,
          reorder_point: 50,
          priority: 'high'
        },
        {
          sku: 'SKU-2934',
          product_name: 'Smart Watch Series X',
          current_stock: 8,
          reorder_point: 25,
          priority: 'critical'
        },
        {
          sku: 'SKU-5621',
          product_name: 'Bluetooth Speaker',
          current_stock: 23,
          reorder_point: 40,
          priority: 'medium'
        }
      ]
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(inventoryData),
    };
  } catch (error) {
    console.error('Error in inventory function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};