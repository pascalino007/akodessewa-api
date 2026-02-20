import { MiddlewareConsumer, NestModule } from '@nestjs/common';

export class BodyParserConfig {
  static configure(consumer: MiddlewareConsumer) {
    // This will be applied in the AppModule
  }
}

// Alternative approach: Create a custom middleware
export const largePayloadMiddleware = (req: any, res: any, next: any) => {
  // Set headers to allow large payloads
  res.header('Content-Type', 'application/json');
  next();
};
