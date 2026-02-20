# Akodessewa API

RESTful API Backend for the Akodessewa Auto Parts Platform — built with **NestJS**, **Prisma**, and **PostgreSQL**.

Serves three frontends:
- **autocorewebsite** — public e-commerce site (port 3000)
- **akodessewa-supplier-portal** — supplier dashboard (port 3001)
- **autocore-dashboard** — admin dashboard (port 3002)

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

The API runs on `http://localhost:4040` with Swagger docs at `http://localhost:4040/docs`.

## Environment Variables

Copy `.env` and update values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `SPACES_ENDPOINT` | Digital Ocean Spaces endpoint |
| `SPACES_KEY` | DO Spaces access key |
| `SPACES_SECRET` | DO Spaces secret key |
| `SPACES_BUCKET` | DO Spaces bucket name |

## API Modules

| Module | Prefix | Description |
|---|---|---|
| **Auth** | `/api/v1/auth` | Register, login, JWT refresh, password reset |
| **Users** | `/api/v1/users` | CRUD, roles, addresses |
| **Categories** | `/api/v1/categories` | Category tree (AUTO/MOTO) |
| **Brands** | `/api/v1/brands` | Part manufacturers |
| **Products** | `/api/v1/products` | Full catalog with images, specs, compatibility |
| **Cars** | `/api/v1/cars` | Vehicle registry (make/model/year/trim) |
| **Search** | `/api/v1/search` | VIN decode, product search, suggestions |
| **Garage** | `/api/v1/garage` | User vehicle garage + compatible parts |
| **Shops** | `/api/v1/shops` | Supplier shops |
| **Orders** | `/api/v1/orders` | Order lifecycle, status tracking |
| **Payments** | `/api/v1/payments` | Payment processing, auto wallet credit |
| **Wallet** | `/api/v1/wallet` | Supplier earnings & withdrawals |
| **Subscriptions** | `/api/v1/subscriptions` | Supplier plans (Basic/Premium/VIP) |
| **Promotions** | `/api/v1/promotions` | Discount codes & campaigns |
| **Marketplace** | `/api/v1/marketplace` | Used vehicles listings |
| **Delivery** | `/api/v1/delivery` | Delivery personnel management |
| **Mechanics** | `/api/v1/mechanics` | Mechanic shops directory |
| **Chat** | `/api/v1/chat` | REST + WebSocket messaging |
| **Slides** | `/api/v1/slides` | Homepage banners & ads |
| **Notifications** | `/api/v1/notifications` | User notifications |
| **Reviews** | `/api/v1/reviews` | Product reviews & ratings |
| **Analytics** | `/api/v1/analytics` | Admin & supplier dashboards |
| **Upload** | `/api/v1/upload` | File upload to DO Spaces |

## Authentication

All endpoints require JWT bearer token except those marked `@Public()`.

```
Authorization: Bearer <access_token>
```

### Roles
`ADMIN` · `MANAGER` · `ACCOUNTANT` · `LOGISTICS` · `SUPPLIER` · `MECHANIC` · `CUSTOMER`

## WebSocket (Chat)

Connect to `/chat` namespace with `?userId=<id>`:

```js
const socket = io('http://localhost:4040/chat', { query: { userId } });
socket.emit('joinRoom', { roomId });
socket.emit('sendMessage', { roomId, content: 'Hello!' });
socket.on('newMessage', (message) => { /* ... */ });
```

## Project Structure

```
src/
├── main.ts                 # Entry point + Swagger setup
├── app.module.ts           # Root module wiring
├── prisma/                 # PrismaService (global)
├── common/                 # Guards, decorators, DTOs
├── auth/                   # JWT auth, registration, password reset
├── upload/                 # S3/DO Spaces file uploads
├── users/                  # User management + addresses
├── categories/             # Category tree
├── brands/                 # Brand management
├── products/               # Product CRUD + images + specs
├── cars/                   # Vehicle registry
├── search/                 # VIN decode + product search
├── garage/                 # User vehicle garage
├── shops/                  # Supplier shops
├── orders/                 # Order lifecycle
├── payments/               # Payment processing
├── wallet/                 # Supplier wallet
├── subscriptions/          # Subscription plans
├── promotions/             # Discount campaigns
├── marketplace/            # Used vehicles
├── delivery/               # Delivery personnel
├── mechanics/              # Mechanic shops
├── chat/                   # Real-time chat (WebSocket)
├── slides/                 # Homepage banners
├── notifications/          # Notifications
├── reviews/                # Product reviews
└── analytics/              # Dashboard statistics
```

## Scripts

```bash
npm run start:dev        # Development with hot-reload
npm run start:prod       # Production
npm run build            # Build for production
npm run prisma:studio    # Visual database browser
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
```
