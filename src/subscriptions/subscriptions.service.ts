import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_PRICES = { BASIC: 0, PREMIUM: 15000, VIP: 35000 };
const PLAN_DURATION_DAYS = 90; // quarterly

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No subscription found');
    return { ...sub, isExpired: sub.endDate < new Date() };
  }

  async changePlan(userId: string, plan: 'BASIC' | 'PREMIUM' | 'VIP') {
    const price = PLAN_PRICES[plan];
    const endDate = new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, amount: price, endDate, status: 'ACTIVE' },
      update: { plan, amount: price, endDate, status: 'ACTIVE' },
    });
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No subscription found');
    return this.prisma.subscription.update({
      where: { userId },
      data: { status: 'CANCELLED' },
    });
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, plan, status } = query;
    const where: any = {};
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
