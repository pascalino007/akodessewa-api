import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.brand.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(data: { name: string; logo?: string; country?: string }) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Brand already exists');
    return this.prisma.brand.create({ data: { ...data, slug } });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.name) data.slug = slugify(data.name, { lower: true, strict: true });
    return this.prisma.brand.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.brand.update({ where: { id }, data: { isActive: false } });
    return { message: 'Brand deactivated' };
  }
}
