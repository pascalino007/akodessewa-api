import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard() {
    const [
      totalUsers, totalProducts, totalOrders, totalShops,
      totalRevenue, pendingOrders, activeListings, totalCategories,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.shop.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.usedVehicle.count({ where: { status: 'ACTIVE' } }),
      this.prisma.category.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalShops,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingOrders,
      activeListings,
      totalCategories,
    };
  }

  async getSupplierDashboard(userId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) return null;

    const [
      totalProducts, totalOrders, completedOrders, pendingOrders,
      totalRevenue, walletBalance, totalReviews, avgRating,
    ] = await Promise.all([
      this.prisma.product.count({ where: { shopId: shop.id, isActive: true } }),
      this.prisma.order.count({ where: { shopId: shop.id } }),
      this.prisma.order.count({ where: { shopId: shop.id, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { shopId: shop.id, status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', order: { shopId: shop.id } },
        _sum: { amount: true },
      }),
      this.prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
      this.prisma.review.count({
        where: { product: { shopId: shop.id } },
      }),
      this.prisma.review.aggregate({
        where: { product: { shopId: shop.id } },
        _avg: { rating: true },
      }),
    ]);

    return {
      shopName: shop.name,
      totalProducts,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: totalRevenue._sum.amount || 0,
      walletBalance: walletBalance?.balance || 0,
      totalReviews,
      avgRating: avgRating._avg.rating || 0,
    };
  }

  async getRecentOrders(shopId?: string, limit = 10) {
    const where: any = {};
    if (shopId) where.shopId = shopId;
    return this.prisma.order.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }

  async getOrderStats(shopId?: string, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: any = { createdAt: { gte: startDate } };
    if (shopId) where.shopId = shopId;

    const orders = await this.prisma.order.findMany({
      where,
      select: { createdAt: true, total: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = { count: 0, revenue: 0 };
      byDate[date].count++;
      byDate[date].revenue += Number(order.total);
    }

    // Status breakdown
    const statusCounts = await this.prisma.order.groupBy({
      by: ['status'],
      where: shopId ? { shopId } : {},
      _count: true,
    });

    return {
      daily: Object.entries(byDate).map(([date, data]) => ({ date, ...data })),
      statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  async getTopProducts(shopId?: string, limit = 10) {
    const where: any = { isActive: true };
    if (shopId) where.shopId = shopId;
    return this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: { salesCount: 'desc' },
      select: {
        id: true, name: true, slug: true, price: true, salesCount: true, viewCount: true, rating: true,
        images: { where: { isMain: true }, take: 1 },
      },
    });
  }

  async getUserStats() {
    const roleCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = await this.prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    return {
      byRole: roleCounts.map((r) => ({ role: r.role, count: r._count })),
      newUsersThisMonth,
    };
  }
}
