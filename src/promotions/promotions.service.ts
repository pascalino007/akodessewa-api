import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, isActive, shopId } = query;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (shopId) where.shopId = shopId;

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { products: { include: { product: { select: { id: true, name: true, slug: true } } } } },
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async getActive() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      include: { products: { include: { product: { include: { images: { where: { isMain: true }, take: 1 } } } } } },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async validateCode(code: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promo) throw new NotFoundException('Invalid promotion code');
    if (!promo.isActive) throw new BadRequestException('Promotion is inactive');
    if (promo.endDate < new Date()) throw new BadRequestException('Promotion has expired');
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) throw new BadRequestException('Promotion usage limit reached');
    return promo;
  }

  async create(data: any) {
    const { productIds, ...promoData } = data;
    return this.prisma.promotion.create({
      data: {
        ...promoData,
        products: productIds?.length ? {
          createMany: { data: productIds.map((productId: string) => ({ productId })) },
        } : undefined,
      },
      include: { products: { include: { product: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const { productIds, ...promoData } = data;
    if (productIds) {
      await this.prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
      await this.prisma.promotionProduct.createMany({
        data: productIds.map((productId: string) => ({ promotionId: id, productId })),
      });
    }
    return this.prisma.promotion.update({ where: { id }, data: promoData, include: { products: { include: { product: true } } } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.promotion.update({ where: { id }, data: { isActive: false } });
    return { message: 'Promotion deactivated' };
  }
}
