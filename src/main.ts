import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

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

  // Register global interceptor and exception filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const PORT = process.env.API_PORT || 3003;
  
  // Fastify needs 0.0.0.0 or explicit host IP to allow external connections on local networks
  await app.listen(PORT, "0.0.0.0");
  console.log(`NestJS Fastify server running on http://localhost:${PORT}`);
}

bootstrap();
