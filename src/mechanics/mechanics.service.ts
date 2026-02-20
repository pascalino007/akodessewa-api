import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import slugify from 'slugify';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MechanicsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, city, country } = query;
    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = country;

    const [data, total] = await Promise.all([
      this.prisma.mechanicShop.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { rating: 'desc' },
        include: { services: true, images: { orderBy: { order: 'asc' } } },
      }),
      this.prisma.mechanicShop.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const shop = await this.prisma.mechanicShop.findUnique({
      where: { id },
      include: { services: true, images: { orderBy: { order: 'asc' } } },
    });
    if (!shop) throw new NotFoundException('Mechanic shop not found');
    return shop;
  }

  async create(data: any) {
    const { services, images, ...shopData } = data;
    const slug = slugify(shopData.name, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);
    return this.prisma.mechanicShop.create({
      data: {
        ...shopData, slug,
        services: services?.length ? { createMany: { data: services } } : undefined,
        images: images?.length ? { createMany: { data: images.map((url: string, i: number) => ({ url, order: i })) } } : undefined,
      },
      include: { services: true, images: true },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const { services, images, ...shopData } = data;
    if (services) {
      await this.prisma.mechanicService.deleteMany({ where: { shopId: id } });
      await this.prisma.mechanicService.createMany({ data: services.map((s: any) => ({ shopId: id, ...s })) });
    }
    if (images) {
      await this.prisma.mechanicShopImage.deleteMany({ where: { shopId: id } });
      await this.prisma.mechanicShopImage.createMany({ data: images.map((url: string, i: number) => ({ shopId: id, url, order: i })) });
    }
    return this.prisma.mechanicShop.update({ where: { id }, data: shopData, include: { services: true, images: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.mechanicShop.update({ where: { id }, data: { isActive: false } });
    return { message: 'Mechanic shop deactivated' };
  }
}
