import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix so every route starts with /api
  app.setGlobalPrefix('api');

  // ValidationPipe enforces all class-validator rules from DTOs automatically.
  // whitelist: strips unknown properties from request bodies.
  // forbidNonWhitelisted: throws 400 if unknown properties are sent.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger UI at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Diploma API')
    .setDescription('Gamified programming learning platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
  console.log(`Swagger docs at   http://localhost:${port}/api/docs`);
}

bootstrap();
