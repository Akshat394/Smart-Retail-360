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
    // Simulate system health monitoring
    const services = [
      {
        name: 'API Gateway',
        status: 'healthy',
        uptime: '99.9%',
        response_time: '45ms',
        last_check: new Date().toISOString()
      },
      {
        name: 'Database Cluster',
        status: 'healthy', 
        uptime: '99.8%',
        response_time: '12ms',
        last_check: new Date().toISOString()
      },
      {
        name: 'ML Pipeline',
        status: Math.random() > 0.1 ? 'healthy' : 'warning',
        uptime: '98.7%',
        response_time: '156ms',
        last_check: new Date().toISOString()
      },
      {
        name: 'Real-time Streaming',
        status: 'healthy',
        uptime: '99.5%',
        response_time: '23ms', 
        last_check: new Date().toISOString()
      },
      {
        name: 'Cache Layer',
        status: 'healthy',
        uptime: '99.9%',
        response_time: '3ms',
        last_check: new Date().toISOString()
      },
      {
        name: 'Analytics Engine',
        status: Math.random() > 0.05 ? 'healthy' : 'warning',
        uptime: '99.2%',
        response_time: '89ms',
        last_check: new Date().toISOString()
      }
    ];

    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    const overallStatus = healthyServices === totalServices ? 'healthy' : 
                         healthyServices >= totalServices * 0.8 ? 'warning' : 'critical';

    const systemHealth = {
      overall_status: overallStatus,
      healthy_services: healthyServices,
      total_services: totalServices,
      uptime_percentage: Math.round((healthyServices / totalServices) * 100),
      services,
      metrics: {
        cpu_usage: Math.floor(Math.random() * 30 + 45),
        memory_usage: Math.floor(Math.random() * 25 + 60),
        disk_usage: Math.floor(Math.random() * 20 + 35),
        network_throughput: `${Math.floor(Math.random() * 500 + 200)} Mbps`
      },
      last_updated: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(systemHealth),
    };
  } catch (error) {
    console.error('Error in system-health function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};