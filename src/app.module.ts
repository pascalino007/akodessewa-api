import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { CarsModule } from './cars/cars.module';
import { SearchModule } from './search/search.module';
import { GarageModule } from './garage/garage.module';
import { ShopsModule } from './shops/shops.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletModule } from './wallet/wallet.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PromotionsModule } from './promotions/promotions.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { DeliveryModule } from './delivery/delivery.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { ChatModule } from './chat/chat.module';
import { SlidesModule } from './slides/slides.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UploadModule,
    UsersModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    CarsModule,
    SearchModule,
    GarageModule,
    ShopsModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    SubscriptionsModule,
    PromotionsModule,
    MarketplaceModule,
    DeliveryModule,
    MechanicsModule,
    ChatModule,
    SlidesModule,
    NotificationsModule,
    ReviewsModule,
    AnalyticsModule,
  ],
  providers: [
    // Global JWT auth guard (use @Public() to skip)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global roles guard (use @Roles() to enforce)
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global throttle guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
