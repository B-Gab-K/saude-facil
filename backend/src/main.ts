import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { ConfigService } from './platform/config.service';
import { ApiExceptionFilter, HttpSecurity } from './platform/http';

async function bootstrap(): Promise<void> {
  const config = new ConfigService();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false, httpsOptions: config.httpsOptions, bodyParser: false });
  app.disable('x-powered-by');
  const security = app.get(HttpSecurity);
  app.use(security.handle.bind(security));
  app.useBodyParser('json', { limit: '16kb' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({ origin: config.origins, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'], methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] });
  app.useStaticAssets(resolve(__dirname, '../../frontend'), { index: 'index.html', etag: false, maxAge: 0 });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1');
}

bootstrap().catch((error: unknown) => {
  console.error(JSON.stringify({ event: 'startup_error', message: error instanceof Error ? error.message : 'UnknownError' }));
  process.exit(1);
});
