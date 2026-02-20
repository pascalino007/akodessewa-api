import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Configure body parser limits using NestJS built-in method
  app.use((req, res, next) => {
    res.header('Content-Type', 'application/json');
    next();
  });
  
  // Set up body parser middleware directly
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.SUPPLIER_PORTAL_URL || 'http://localhost:3001',
      process.env.DASHBOARD_URL || 'http://localhost:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Akodessewa API')
    .setDescription('RESTful API for Akodessewa Auto Parts Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User management')
    .addTag('Categories', 'Product categories')
    .addTag('Brands', 'Product brands')
    .addTag('Products', 'Auto/Moto parts catalog')
    .addTag('Cars', 'Vehicle registry')
    .addTag('Search', 'VIN & product search')
    .addTag('Garage', 'User vehicle garage')
    .addTag('Shops', 'Supplier shops')
    .addTag('Orders', 'Order management')
    .addTag('Payments', 'Payment processing')
    .addTag('Promotions', 'Discounts & promotions')
    .addTag('Marketplace', 'Used vehicles marketplace')
    .addTag('Delivery', 'Delivery personnel')
    .addTag('Chat', 'Real-time messaging')
    .addTag('Slides', 'Homepage slides & banners')
    .addTag('Wallet', 'Supplier wallet & payouts')
    .addTag('Subscriptions', 'Supplier subscriptions')
    .addTag('Reviews', 'Product reviews')
    .addTag('Notifications', 'User notifications')
    .addTag('Mechanics', 'Mechanics shops')
    .addTag('Analytics', 'Dashboard analytics')
    .addTag('Upload', 'File uploads')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4040;
  await app.listen(port);
  console.log(`🚀 Akodessewa API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
