import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('admin/dashboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  getAdminDashboard() { return this.analyticsService.getAdminDashboard(); }

  @Get('supplier/dashboard')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get supplier dashboard stats' })
  getSupplierDashboard(@CurrentUser('id') userId: string) {
    return this.analyticsService.getSupplierDashboard(userId);
  }

  @Get('orders/recent')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @ApiOperation({ summary: 'Get recent orders' })
  getRecentOrders(@Query('shopId') shopId?: string, @Query('limit') limit?: number) {
    return this.analyticsService.getRecentOrders(shopId, limit);
  }

  @Get('orders/stats')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @ApiOperation({ summary: 'Get order statistics' })
  getOrderStats(@Query('shopId') shopId?: string, @Query('days') days?: number) {
    return this.analyticsService.getOrderStats(shopId, days);
  }

  @Get('products/top')
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @ApiOperation({ summary: 'Get top selling products' })
  getTopProducts(@Query('shopId') shopId?: string, @Query('limit') limit?: number) {
    return this.analyticsService.getTopProducts(shopId, limit);
  }

  @Get('users/stats')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get user statistics' })
  getUserStats() { return this.analyticsService.getUserStats(); }
}
