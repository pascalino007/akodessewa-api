import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getMyNotifications(userId: string, query: any) {
    const { page = 1, limit = 20, isRead } = query;
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { unreadCount: count };
  }

  async markAsRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }

  async create(data: { userId: string; title: string; message: string; type: string; data?: any }) {
    return this.prisma.notification.create({ data });
  }

  async deleteOld(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.notification.deleteMany({
      where: { userId, isRead: true, createdAt: { lt: thirtyDaysAgo } },
    });
    return { message: 'Old notifications deleted' };
  }
}
