import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, status, method, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { order: { select: { id: true, orderNumber: true, userId: true, shopId: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, items: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async createPayment(orderId: string, data: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment) throw new BadRequestException('Payment already exists for this order');

    return this.prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        currency: order.currency,
        method: data.method,
        provider: data.provider,
        transactionId: data.transactionId,
        metadata: data.metadata,
      },
      include: { order: { select: { id: true, orderNumber: true } } },
    });
  }

  async updateStatus(id: string, status: string, providerRef?: string) {
    const payment = await this.findOne(id);

    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.paidAt = new Date();
    if (providerRef) updateData.providerRef = providerRef;

    const updated = await this.prisma.payment.update({
      where: { id },
      data: updateData,
    });

    // Auto-confirm order when payment completes
    if (status === 'COMPLETED') {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'CONFIRMED',
          statusHistory: { create: { status: 'CONFIRMED', note: 'Payment confirmed' } },
        },
      });

      // Credit supplier wallet
      const order = await this.prisma.order.findUnique({ where: { id: payment.orderId }, include: { shop: true } });
      if (order?.shop) {
        const commission = Number(order.total) * 0.05; // 5% commission
        const supplierAmount = Number(order.total) - commission;

        await this.prisma.wallet.upsert({
          where: { userId: order.shop.ownerId },
          create: { userId: order.shop.ownerId, balance: supplierAmount },
          update: { balance: { increment: supplierAmount } },
        });

        await this.prisma.walletTransaction.create({
          data: {
            wallet: { connect: { userId: order.shop.ownerId } },
            amount: supplierAmount,
            type: 'CREDIT',
            status: 'COMPLETED',
            description: `Payment for order ${order.orderNumber}`,
            reference: payment.id,
          },
        });
      }
    }

    return updated;
  }
}
