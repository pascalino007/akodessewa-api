import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlidesService {
  constructor(private prisma: PrismaService) {}

  async getActive(position?: string) {
    const now = new Date();
    const where: any = {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
      ],
    };
    if (position) where.position = position;

    return this.prisma.slide.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, position } = query;
    const where: any = {};
    if (position) where.position = position;

    const [data, total] = await Promise.all([
      this.prisma.slide.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { order: 'asc' },
      }),
      this.prisma.slide.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const slide = await this.prisma.slide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Slide not found');
    return slide;
  }

  async create(data: any) {
    return this.prisma.slide.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.slide.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.slide.delete({ where: { id } });
    return { message: 'Slide deleted' };
  }
}
