import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getProductReviews(productId: string, query: any) {
    const { page = 1, limit = 10 } = query;
    const where = { productId };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async create(userId: string, data: { productId: string; rating: number; title?: string; comment?: string }) {
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: data.productId } },
    });
    if (existing) throw new ConflictException('You already reviewed this product');

    const review = await this.prisma.review.create({
      data: { ...data, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    // Update product rating
    await this.updateProductRating(data.productId);

    return review;
  }

  async update(userId: string, id: string, data: any) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.review.update({
      where: { id }, data,
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    await this.updateProductRating(review.productId);
    return updated;
  }

  async remove(userId: string, id: string, role: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (role !== 'ADMIN' && review.userId !== userId) throw new ForbiddenException();

    await this.prisma.review.delete({ where: { id } });
    await this.updateProductRating(review.productId);
    return { message: 'Review deleted' };
  }

  private async updateProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: agg._avg.rating || 0, reviewCount: agg._count },
    });
  }
}
