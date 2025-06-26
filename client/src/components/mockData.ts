import { faker } from '@faker-js/faker';

// Types for dashboard data
export type KPI = {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  color: string;
  description: string;
};

export type InventoryItem = {
  id: number;
  productName: string;
  category: string;
  location: string;
  quantity: number;
  state: string;
  city: string;
  year: number;
  month: string;
};

export type Order = {
  id: number;
  productName: string;
  location: string;
  quantity: number;
  customerName: string;
  customerContact: string;
  status: string;
  channel: string;
  createdAt: string;
};

export type AnalyticsData = {
  date: string;
  co2: number;
  score: number;
  category: string;
  channel: string;
  outlier: boolean;
};

export type SustainabilityData = {
  totalOrders: number;
  greenOrders: number;
  co2Saved: string;
  greenDeliveryRate: number;
  channelData: { channel: string; greenRate: number }[];
};

export type Robot = {
  id: string;
  status: 'active' | 'charging' | 'maintenance' | 'error';
  battery: number;
  tasksCompleted: number;
  efficiency: number;
};

export type RoboticsData = {
  totalTasks: number;
  avgEfficiency: string;
  robots: Robot[];
};

export type RouteOptimizationData = {
  region: string;
  traditional: number;
  optimized: number;
  savings: number;
};

export type SystemHealthData = {
  uptime: string;
  avgResponseTime: string;
  services: { name: string; status: 'operational' | 'degraded' | 'outage' }[];
  responseTimeHistory: { time: string; ms: number }[];
};

// A structured map of Walmart categories and their associated brands/products
const walmartProductCatalog = {
  "Grocery & Beverages": {
    brands: ["Great Value", "Sam's Choice", "Bettergoods", "Clear American", "Oak Leaf"],
    products: ["Soda", "Chips", "Organic Pasta", "Premium Coffee", "Sparkling Water", "Red Wine"],
  },
  "Home & Kitchen": {
    brands: ["Mainstays", "Better Homes & Gardens", "Hometrends", "Allswell"],
    products: ["Towel Set", "Lava Lamp", "Cookware", "Bedding", "Storage Bins", "Memory Foam Mattress"],
  },
  "Health & Beauty": {
    brands: ["Equate"],
    products: ["Lotion", "OTC Meds", "Skincare", "Cosmetics", "Grooming Tools", "Supplements"],
  },
  "Electronics": {
    brands: ["onn."], // A common Walmart brand
    products: ["4K TV", "Gaming Laptop", "Tablet", "Bluetooth Speaker", "Fitness Tracker"],
  },
  "Clothing & Apparel": {
    brands: ["George", "Time and Tru", "Terra & Sky", "No Boundaries", "Athletic Works", "Joyspun"],
    products: ["T-Shirt", "Jeans", "Plus-Size Top", "Graphic Tee", "Activewear Shorts", "Pajama Set"],
  },
  "Baby & Kids": {
    brands: ["Parent's Choice", "Wonder Nation"],
    products: ["Diapers", "Baby Formula", "Kids T-Shirt", "Stroller", "Nursery Furniture"],
  },
  "Household Essentials": {
    brands: ["Great Value"],
    products: ["Paper Towels", "Cleaning Spray", "Pest Control", "Food Storage Bags"],
  },
  "Toys & Games": {
    brands: ["Adventure Force"],
    products: ["Action Figure", "Board Game", "Kids Bike", "500-Piece Puzzle", "RC Car"],
  },
  "Sports, Fitness & Outdoors": {
    brands: ["Athletic Works"],
    products: ["Dumbbells", "Yoga Mat", "Camping Tent", "Fishing Rod", "Basketball"],
  },
  "Automotive & Tools": {
    brands: ["Hyper Tough"],
    products: ["Motor Oil", "Car Battery", "Wrench Set", "Power Drill", "Tire Repair Kit"],
  },
  "Pet Supplies": {
    brands: ["Ol' Roy", "Special Kitty"],
    products: ["Dog Food", "Cat Litter", "Pet Shampoo", "Chew Toys", "Cat Tree"],
  },
  "Office & School Supplies": {
    brands: ["Pen+Gear"],
    products: ["Notebook", "Printer Paper", "Backpack", "Sticky Notes", "Ballpoint Pens"],
  },
  "Garden & Outdoor Living": {
    brands: ["Expert Grill", "Mainstays"],
    products: ["Patio Chair", "Gardening Tools", "Charcoal Grill", "Flower Pot", "Outdoor String Lights"],
  },
};

type Category = keyof typeof walmartProductCatalog;

// Mock KPI data
export const kpiCards: KPI[] = [
  {
    title: 'Forecast Accuracy',
    value: '97.2%',
    change: '+2.3%',
    changeType: 'positive',
    icon: 'Target',
    color: 'from-blue-500 to-blue-600',
    description: 'MAPE score across all SKUs',
  },
  {
    title: 'On-Time Delivery',
    value: '93.8%',
    change: '+1.8%',
    changeType: 'positive',
    icon: 'Truck',
    color: 'from-green-500 to-green-600',
    description: 'SLA compliance rate',
  },
  {
    title: 'Carbon Footprint',
    value: '4.2 kg CO₂',
    change: '-12%',
    changeType: 'positive',
    icon: 'Leaf',
    color: 'from-emerald-500 to-emerald-600',
    description: 'Per delivery optimization',
  },
  {
    title: 'Cost Savings',
    value: '$12,400',
    change: '+18.4%',
    changeType: 'positive',
    icon: 'TrendingUp',
    color: 'from-purple-500 to-purple-600',
    description: 'Monthly optimization gains',
  },
];

// Mock Inventory data
const categories = Object.keys(walmartProductCatalog) as Category[];
export const inventory: InventoryItem[] = Array.from({ length: 200 }, (_, i) => {
  const category = categories[i % categories.length];
  const catalogEntry = walmartProductCatalog[category];
  const brand = catalogEntry.brands[i % catalogEntry.brands.length];
  const product = catalogEntry.products[i % catalogEntry.products.length];
  const productName = `${brand} ${product}`;

  return {
    id: i + 1,
    productName,
    category,
    location: `Warehouse ${1 + (i % 5)}`,
    quantity: Math.floor(Math.random() * 250),
    state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][i % 5],
    city: ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata'][i % 5],
    year: 2022 + (i % 3), // 2022, 2023, 2024
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i % 12],
  };
});

// Mock Orders data
const customerNames = [
  'Amit Kumar', 'Priya Singh', 'Ravi Patel', 'Sunita Sharma', 'Vikram Rao',
  'Neha Verma', 'Arjun Mehta', 'Kavita Joshi', 'Suresh Reddy', 'Meera Nair',
  'Deepak Shah', 'Anjali Gupta', 'Rahul Yadav', 'Pooja Desai', 'Manish Jain',
];
const orderStatuses = ['Pending', 'Ready', 'Completed', 'Collected', 'Cancelled'];
const orderChannels = ['Online', 'In-Store', 'Mobile', 'Partner', 'Click & Collect'];
const locations = ['Warehouse 1', 'Warehouse 2', 'Warehouse 3', 'Warehouse 4', 'Warehouse 5', 'Warehouse 6', 'Warehouse 7'];

export const orders: Order[] = Array.from({ length: 500 }, (_, i) => {
  const inventoryItem = inventory[i % inventory.length];
  return {
    id: 1000 + i,
    productName: inventoryItem.productName,
    location: locations[i % locations.length],
    quantity: 1 + (i % 10),
    customerName: customerNames[i % customerNames.length],
    customerContact: `+91-98${Math.floor(10000000 + Math.random() * 90000000)}`,
    status: orderStatuses[i % orderStatuses.length],
    channel: orderChannels[i % orderChannels.length],
    createdAt: new Date(Date.now() - i * 3600 * 1000 * 3).toISOString(),
  };
});

// Mock Analytics data (90 days, with category, channel, outlier)
const categoriesForAnalytics = categories;
const channelsForAnalytics = orderChannels;
export const analyticsData: AnalyticsData[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (89 - i));
  return {
    date: d.toLocaleDateString(),
    co2: 4 + Math.random() * 6,
    score: 4 + Math.random() * 6,
    category: categoriesForAnalytics[i % categoriesForAnalytics.length],
    channel: channelsForAnalytics[i % channelsForAnalytics.length],
    outlier: Math.random() < 0.07, // 7% chance of anomaly
  };
});

// Category sales (for bar/line chart)
export const categorySales = categoriesForAnalytics.map((cat, i) => ({
  category: cat,
  sales: 1000 + Math.floor(Math.random() * 5000),
  returns: Math.floor(Math.random() * 200),
}));

// Channel distribution (for pie/donut chart)
export const channelDistribution = channelsForAnalytics.map((ch, i) => ({
  channel: ch,
  orders: 200 + Math.floor(Math.random() * 800),
}));

// Top customers (for bar chart)
export const topCustomers = customerNames.map((name, i) => ({
  customer: name,
  orders: 10 + Math.floor(Math.random() * 90),
  value: 1000 + Math.floor(Math.random() * 9000),
}));

// Order volume heatmap (calendar-style)
export const orderVolumeHeatmap = Array.from({ length: 90 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (89 - i));
  return {
    date: d.toLocaleDateString(),
    orders: 50 + Math.floor(Math.random() * 100),
  };
});

// Mock Sustainability data
export const sustainabilityData: SustainabilityData = {
  totalOrders: 1500,
  greenOrders: 450,
  co2Saved: '1.2 tons',
  greenDeliveryRate: 30, // 450 / 1500
  channelData: [
    { channel: 'Online', greenRate: 62 },
    { channel: 'In-Store', greenRate: 48 },
    { channel: 'Mobile', greenRate: 71 },
    { channel: 'Partner', greenRate: 39 },
  ],
};

// Mock Robotics data
export const roboticsData: RoboticsData = {
  totalTasks: 1250,
  avgEfficiency: '98.2%',
  robots: [
    { id: 'R-001', status: 'active', battery: 85, tasksCompleted: 150, efficiency: 99.1 },
    { id: 'R-002', status: 'active', battery: 92, tasksCompleted: 180, efficiency: 98.5 },
    { id: 'R-003', status: 'charging', battery: 25, tasksCompleted: 120, efficiency: 97.2 },
    { id: 'R-004', status: 'active', battery: 78, tasksCompleted: 165, efficiency: 99.5 },
    { id: 'R-005', status: 'maintenance', battery: 50, tasksCompleted: 95, efficiency: 96.8 },
    { id: 'R-006', status: 'error', battery: 10, tasksCompleted: 210, efficiency: 95.0 },
  ],
};

// Mock Route Optimization data
export const routeOptimizationData: RouteOptimizationData[] = [
  { region: 'North', traditional: 120, optimized: 89, savings: 26 },
  { region: 'South', traditional: 98, optimized: 76, savings: 22 },
  { region: 'East', traditional: 145, optimized: 112, savings: 23 },
  { region: 'West', traditional: 87, optimized: 68, savings: 22 },
  { region: 'Central', traditional: 156, optimized: 118, savings: 24 },
];

// Mock System Health data
export const systemHealthData: SystemHealthData = {
  uptime: '99.98%',
  avgResponseTime: '120ms',
  services: [
    { name: 'API Gateway', status: 'operational' },
    { name: 'Database', status: 'operational' },
    { name: 'ML Service', status: 'degraded' },
    { name: 'Frontend', status: 'operational' },
    { name: 'Simulation Engine', status: 'outage' },
  ],
  responseTimeHistory: Array.from({ length: 12 }, (_, i) => ({
    time: `${(i + 1) * 5}m ago`,
    ms: 100 + Math.random() * 50,
  })),
};

// Mock vehicle and drone data for map and route optimization
export const vehicles = [
  { id: 1, type: 'Truck', status: 'Active', lat: 19.076, lng: 72.877, label: 'Truck 1', color: '#6366F1', state: 'Maharashtra', city: 'Mumbai' },
  { id: 2, type: 'Drone', status: 'Idle', lat: 19.08, lng: 72.88, label: 'Drone 1', color: '#10B981', state: 'Maharashtra', city: 'Mumbai' },
  { id: 3, type: 'Autonomous', status: 'Delivering', lat: 19.07, lng: 72.88, label: 'Auto 1', color: '#F59E0B', state: 'Karnataka', city: 'Bengaluru' },
  { id: 4, type: 'Truck', status: 'Idle', lat: 19.075, lng: 72.875, label: 'Truck 2', color: '#6366F1', state: 'Delhi', city: 'Delhi' },
  { id: 5, type: 'Drone', status: 'Active', lat: 19.078, lng: 72.879, label: 'Drone 2', color: '#10B981', state: 'West Bengal', city: 'Kolkata' },
  { id: 6, type: 'Autonomous', status: 'Idle', lat: 19.072, lng: 72.872, label: 'Auto 2', color: '#F59E0B', state: 'Tamil Nadu', city: 'Chennai' },
  { id: 7, type: 'Drone', status: 'Delivering', lat: 19.074, lng: 72.876, label: 'Drone 3', color: '#10B981', state: 'Karnataka', city: 'Bengaluru' },
  { id: 8, type: 'Truck', status: 'Active', lat: 19.079, lng: 72.881, label: 'Truck 3', color: '#6366F1', state: 'West Bengal', city: 'Kolkata' },
];

export function generateInventory(count = 200) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    productName: faker.commerce.productName(),
    category: faker.commerce.department(),
    location: faker.location.city(),
    quantity: faker.number.int({ min: 0, max: 250 }),
    state: faker.location.state(),
    city: faker.location.city(),
    year: faker.date.past({ years: 3 }).getFullYear(),
    month: faker.date.month(),
  }));
}

export function generateOrders(count = 500, inventory = generateInventory()) {
  return Array.from({ length: count }, (_, i) => {
    const inventoryItem = inventory[faker.number.int({ min: 0, max: inventory.length - 1 })];
    // Generate a random 10-digit number for Indian phone numbers
    const phone = '+91-' + faker.number.int({ min: 9000000000, max: 9999999999 }).toString();
    return {
      id: faker.number.int({ min: 1000, max: 9999 }),
      productName: inventoryItem.productName,
      location: inventoryItem.location,
      quantity: faker.number.int({ min: 1, max: 10 }),
      customerName: faker.person.fullName(),
      customerContact: phone,
      status: faker.helpers.arrayElement(['Pending', 'Ready', 'Completed', 'Collected', 'Cancelled']),
      channel: faker.helpers.arrayElement(['Online', 'In-Store', 'Mobile', 'Partner', 'Click & Collect']),
      createdAt: faker.date.recent({ days: 90 }).toISOString(),
    };
  });
}

export function generateAnalyticsData(days = 90) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString(),
      co2: faker.number.float({ min: 4, max: 10, fractionDigits: 2 }),
      score: faker.number.float({ min: 4, max: 10, fractionDigits: 2 }),
      category: faker.commerce.department(),
      channel: faker.helpers.arrayElement(['Online', 'In-Store', 'Mobile', 'Partner', 'Click & Collect']),
      outlier: faker.datatype.boolean() && faker.number.int({ min: 1, max: 100 }) < 7,
    };
  });
}

export function generateVehicles(count = 20) {
  const types = ['Truck', 'Mini Truck', 'Drone', 'Autonomous Vehicle'];
  return Array.from({ length: count }, (_, i) => {
    const type = faker.helpers.arrayElement(types);
    return {
      id: i + 1,
      type,
      deliveryMode: type,
      status: faker.helpers.arrayElement(['Active', 'Idle', 'Delivering']),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
      label: `${type} ${i + 1}`,
      color: faker.color.rgb(),
      state: faker.location.state(),
      city: faker.location.city(),
    };
  });
}

export function generateSystemHealthData() {
  return {
    uptime: `${faker.number.float({ min: 98, max: 100, fractionDigits: 2 })}%`,
    avgResponseTime: `${faker.number.int({ min: 80, max: 200 })}ms`,
    services: [
      { name: 'API Gateway', status: faker.helpers.arrayElement(['operational', 'degraded', 'outage']) },
      { name: 'Database', status: faker.helpers.arrayElement(['operational', 'degraded', 'outage']) },
      { name: 'ML Service', status: faker.helpers.arrayElement(['operational', 'degraded', 'outage']) },
      { name: 'Frontend', status: faker.helpers.arrayElement(['operational', 'degraded', 'outage']) },
      { name: 'Simulation Engine', status: faker.helpers.arrayElement(['operational', 'degraded', 'outage']) },
    ],
    responseTimeHistory: Array.from({ length: 12 }, (_, i) => ({
      time: `${(i + 1) * 5}m ago`,
      ms: faker.number.int({ min: 80, max: 200 }),
    })),
  };
}

export function generateSustainabilityData() {
  return {
    totalOrders: faker.number.int({ min: 1000, max: 3000 }),
    greenOrders: faker.number.int({ min: 300, max: 1500 }),
    co2Saved: `${faker.number.float({ min: 0.5, max: 5, fractionDigits: 2 })} tons`,
    greenDeliveryRate: faker.number.int({ min: 10, max: 80 }),
    channelData: [
      { channel: 'Online', greenRate: faker.number.int({ min: 30, max: 90 }) },
      { channel: 'In-Store', greenRate: faker.number.int({ min: 30, max: 90 }) },
      { channel: 'Mobile', greenRate: faker.number.int({ min: 30, max: 90 }) },
      { channel: 'Partner', greenRate: faker.number.int({ min: 30, max: 90 }) },
      { channel: 'Click & Collect', greenRate: faker.number.int({ min: 30, max: 90 }) },
    ],
  };
}

export function generateRoboticsData(count = 5) {
  return {
    totalTasks: faker.number.int({ min: 500, max: 2000 }),
    avgEfficiency: `${faker.number.float({ min: 90, max: 100, fractionDigits: 2 })}%`,
    robots: Array.from({ length: count }, (_, i) => ({
      id: `R-${faker.number.int({ min: 100, max: 999 })}`,
      status: faker.helpers.arrayElement(['active', 'charging', 'maintenance', 'error']),
      battery: faker.number.int({ min: 10, max: 100 }),
      tasksCompleted: faker.number.int({ min: 50, max: 200 }),
      efficiency: faker.number.float({ min: 90, max: 100, fractionDigits: 2 }),
    })),
  };
}

export function generateRouteOptimizationData(count = 5) {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  return Array.from({ length: count }, (_, i) => ({
    region: regions[i % regions.length],
    traditional: faker.number.int({ min: 80, max: 200 }),
    optimized: faker.number.int({ min: 60, max: 150 }),
    savings: faker.number.int({ min: 10, max: 50 }),
  }));
} 