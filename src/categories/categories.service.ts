import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: string, includeInactive = false) {
    const where: any = {};
    if (type) where.type = type;
    if (!includeInactive) where.isActive = true;
    where.parentId = null;

    return this.prisma.category.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            children: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: { order: 'asc' },
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { include: { _count: { select: { products: true } } } },
        _count: { select: { products: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: { name: string; description?: string; image?: string; parentId?: string; type?: any; order?: number }) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Category with this name already exists');

    return this.prisma.category.create({
      data: { ...data, slug },
      include: { parent: true, _count: { select: { products: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.name) {
      data.slug = slugify(data.name, { lower: true, strict: true });
    }
    return this.prisma.category.update({
      where: { id },
      data,
      include: { parent: true, _count: { select: { products: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return { message: 'Category deactivated' };
  }
}
