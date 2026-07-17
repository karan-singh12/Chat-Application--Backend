import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RedisIoAdapter } from "./common/adapters/redis-io.adapter";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Register custom Redis adapter for scalable WebSockets
  const redisIoAdapter = new RedisIoAdapter(app);
  const isRedisConnected = await redisIoAdapter.connectToRedis();
  if (isRedisConnected) {
    app.useWebSocketAdapter(redisIoAdapter);
  }

  // Register fastify multipart parser
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB matching Express body limit
    },
  });

  // Register fastify static to serve uploads in public directory
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    prefix: "/public/", // Must match Express public path routing
    decorateReply: false, // Avoid collision with other static decorators if any
  });

  // Set global API prefix
  app.setGlobalPrefix("api");

  // Enable CORS
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization",
  });

  // Register global interceptor, exception filter, and validation pipe
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const PORT = process.env.PORT || process.env.API_PORT || 3003;

  // Fastify needs 0.0.0.0 or explicit host IP to allow external connections on local networks
  await app.listen(PORT, "0.0.0.0");
  console.log(`NestJS Fastify server running on http://localhost:${PORT}`);
}

bootstrap();
