import { Router } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Smart-Retail-360 API',
    version: '1.0.0',
    description: 'OpenAPI documentation for Smart-Retail-360 supply chain platform.'
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local server' }
  ],
  tags: [
    { name: 'Orders', description: 'Order management and tracking' },
    { name: 'Compliance', description: 'GDPR/CCPA endpoints' },
    { name: 'Chatbot', description: 'AI-driven customer experience' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/routes.ts'], // You can add more files for full coverage
};

const swaggerSpec = swaggerJSDoc(options);

router.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router; 