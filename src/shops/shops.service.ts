import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, city, country, isVerified } = query;
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = country;
    if (isVerified !== undefined) where.isVerified = isVerified;

    const [data, total] = await Promise.all([
      this.prisma.shop.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { rating: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          shopImages: true,
          _count: { select: { products: true, orders: true } },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        shopImages: { orderBy: { order: 'asc' } },
        _count: { select: { products: true, orders: true, deliveryPersonnel: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        shopImages: { orderBy: { order: 'asc' } },
        _count: { select: { products: true, orders: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async getMyShop(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
      include: {
        shopImages: { orderBy: { order: 'asc' } },
        _count: { select: { products: true, orders: true, deliveryPersonnel: true } },
      },
    });
    if (!shop) throw new NotFoundException('You do not have a shop');
    return shop;
  }

  async updateMyShop(userId: string, data: any) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new ForbiddenException('You do not have a shop');

    const { images, ...shopData } = data;

    if (images) {
      await this.prisma.shopImage.deleteMany({ where: { shopId: shop.id } });
      await this.prisma.shopImage.createMany({
        data: images.map((url: string, i: number) => ({ shopId: shop.id, url, order: i })),
      });
    }

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: shopData,
      include: { shopImages: true, _count: { select: { products: true, orders: true } } },
    });
  }

  async adminUpdate(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.shop.update({ where: { id }, data });
  }

  async verifyShop(id: string) {
    await this.findOne(id);
    return this.prisma.shop.update({ where: { id }, data: { isVerified: true } });
  }
}
