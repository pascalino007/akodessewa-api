import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  async getMyDeliveryPersonnel(userId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new ForbiddenException('No shop found');
    return this.prisma.deliveryPerson.findMany({
      where: { shopId: shop.id },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: any) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new ForbiddenException('No shop found');
    return this.prisma.deliveryPerson.create({ data: { ...data, shopId: shop.id } });
  }

  async update(userId: string, id: string, data: any) {
    const person = await this.prisma.deliveryPerson.findUnique({ where: { id }, include: { shop: true } });
    if (!person) throw new NotFoundException('Delivery person not found');
    if (person.shop.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.deliveryPerson.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const person = await this.prisma.deliveryPerson.findUnique({ where: { id }, include: { shop: true } });
    if (!person) throw new NotFoundException('Delivery person not found');
    if (person.shop.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.deliveryPerson.update({ where: { id }, data: { isActive: false } });
    return { message: 'Delivery person deactivated' };
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, shopId } = query;
    const where: any = { isActive: true };
    if (shopId) where.shopId = shopId;
    return this.prisma.deliveryPerson.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: { shop: { select: { id: true, name: true } }, _count: { select: { orders: true } } },
    });
  }
}
