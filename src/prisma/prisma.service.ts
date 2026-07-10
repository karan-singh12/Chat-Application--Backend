import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/chat_db";
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log("Prisma successfully connected to PostgreSQL database.");
    } catch (err) {
      console.warn("Prisma connection warning: Database server might be offline.", err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
