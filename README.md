# Chat Application Backend - NestJS

A high-performance, scalable, and secure backend server for a real-time Chat and Social Media application, powered by **NestJS** and **Fastify**.

---

## 🏗️ Architecture Overview

The backend is built following clean-code principles, modular NestJS design patterns, and a layered architecture that decouples HTTP/WebSocket delivery, business logic, and database persistence.

```mermaid
graph TD
    Client[Client / Frontend] -->|HTTP / REST| Fastify[Fastify HTTP Server]
    Client -->|WebSockets| SocketIO[Socket.io Gateway]
    
    subgraph NestJS Backend Application
        Fastify --> Interceptors[Interceptors / Guards / Pipes]
        SocketIO --> WSAdapter[Redis Socket.io Adapter]
        
        Interceptors --> Controllers[Controllers]
        Controllers --> Services[Services]
        
        Services --> Prisma[Prisma ORM]
        Services --> Cache[Redis Cache Storage]
        
        cron[Task Scheduler / Cron] --> Jobs[Background Jobs]
    end
    
    subgraph Data & Caching Tier
        Prisma --> DB[(PostgreSQL Database)]
        Cache --> Redis[(Redis In-Memory Database)]
        WSAdapter --> Redis
    end
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Core Framework** | [NestJS (v11)](https://nestjs.com/) | Structured, modular backend framework |
| **HTTP Engine** | [Fastify](https://fastify.dev/) | High-performance, low-overhead HTTP engine (replacing Express) |
| **Real-time Gateway** | [Socket.io](https://socket.io/) | Bi-directional WebSocket communication |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Robust, relational database system |
| **ORM** | [Prisma](https://www.prisma.io/) | Next-generation Node.js and TypeScript ORM |
| **Caching & Scalability** | [Redis](https://redis.io/) | In-memory cache for WebSocket adapters and rate-limiting |
| **Task Queue** | [BullMQ](https://bullmq.io/) | Redis-backed robust background job processor |
| **Authentication** | [JWT (JSON Web Tokens)](https://jwt.io/) & [BcryptJS](https://github.com/dcodeIO/bcrypt.js) | Stateless auth & password encryption |
| **Validation** | [Class-Validator](https://github.com/typestack/class-validator) | Declarative request DTO validation |

---

## 📂 Directory Structure

```text
Backend-nest/
├── prisma/                 # Database Schema & Migrations
│   └── schema.prisma       # Prisma DB models (User, Messages, Posts, etc.)
├── src/
│   ├── main.ts             # Application entrypoint & Fastify bootstrapping
│   ├── app.module.ts       # Root module importing all configuration & features
│   ├── auth/               # JWT-based Auth Controllers & Strategies
│   ├── chat/               # Socket.io gateways, DTOs, & Chat message business logic
│   ├── common/             # Shared filters, interceptors, guards, and decorators
│   │   ├── adapters/       # Redis Socket.io adapters
│   │   ├── guards/         # Throttling & Proxy authentication guards
│   │   └── interceptors/   # Request monitoring & performance interceptors
│   ├── jobs/               # Background task scheduling, queues, and processors (BullMQ)
│   │   ├── processors/     # Queue job processors (e.g. background-jobs, log-cleanup)
│   │   └── queues/         # Queue services (e.g. background-jobs.service)
│   ├── modules/            # Domain-specific modules:
│   │   ├── users/          # Profile management & friends
│   │   ├── posts/          # Social feeds, likes, & comments
│   │   ├── admin/          # Admin operations
│   │   ├── notifications/  # Notification services
│   │   └── uploads/        # Static asset and file uploading handlers
│   └── prisma/             # Global Prisma database service provider module
```

---

## 🚀 Core Features

### 1. User & Presence Management
* Authentication via securely encrypted credentials and stateless **JWT Tokens**.
* Live presence tracking utilizing socket connections to update users' online/offline statuses and `lastSeen` metadata.
* Rich profile management (avatars, bios, location, and phone number details).

### 2. Real-time Messaging (1:1 & Group Chat)
* Direct peer-to-peer messaging and multi-user room/group conversations.
* Live read receipts (`MessageRead`) and delivery confirmation checks (`MessageDelivery`).
* Rich-text support, emoji reactions (`MessageReaction`), message editing, deletion, replies, and attachments.

### 3. Scalable WebSockets with Redis
* Configured with a `RedisIoAdapter` to allow multiple instances of the backend to synchronize real-time socket events seamlessly via Redis Pub/Sub channels.

### 4. Social Feed Integration
* Dedicated social feed functionality supporting posts creation, comments, and likes.

### 5. Advanced Monitoring & Auditing
* A custom `TrafficMonitorInterceptor` that audits and records all incoming HTTP requests into a `traffic_logs` table (capturing IP addresses, response times, status codes, and flagging suspicious payloads).

### 6. Background Task Queuing (BullMQ)
* High-performance message queueing powered by **BullMQ**.
* Fully compatible with standard or secure Redis servers (ideal for Render Redis or Upstash instances).
* Designed with automatic exponential backoff, retry attempts, and failover capabilities for queue jobs.

---

## ⚙️ Setup & Installation

### Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) (v18+)
* [PostgreSQL](https://www.postgresql.org/)
* [Redis](https://redis.io/)

### 1. Environment Variables Configuration
Create a `.env` file in the root of the backend directory (`Backend-nest/`) and configure the variables:

```env
# Database Settings
DATABASE_URL="postgresql://username:password@localhost:5432/chat_db?schema=public"

# Redis Configuration (Support for Render/Upstash secure URLs)
# For Render or Upstash, configure REDIS_URL with rediss://
# Example: REDIS_URL="rediss://default:password@host:port"
REDIS_URL=""
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_TLS="false"

# JWT Config
JWT_SECRET="your-ultra-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Server Settings
API_PORT=3003
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Migration & Generator
Run the database migrations to apply the schema models to your PostgreSQL database and generate the Prisma Client:
```bash
npx prisma migrate dev --name init
```

### 4. Start the Application

**Development (with Hot-Reloading):**
```bash
npm run dev
```

**Production Build & Run:**
```bash
npm run build
npm run start:prod
```
