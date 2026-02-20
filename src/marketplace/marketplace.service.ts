import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  private includes = {
    images: { orderBy: { order: 'asc' as const } },
    features: true,
    seller: { select: { id: true, firstName: true, lastName: true, phone: true, avatar: true } },
  };

  async findAll(query: any) {
    const { page = 1, limit = 20, type, make, model, minYear, maxYear, minPrice, maxPrice, condition, city, country, status = 'ACTIVE' } = query;
    const where: any = { status };
    if (type) where.type = type;
    if (make) where.make = { contains: make, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (minYear || maxYear) { where.year = {}; if (minYear) where.year.gte = minYear; if (maxYear) where.year.lte = maxYear; }
    if (minPrice || maxPrice) { where.price = {}; if (minPrice) where.price.gte = minPrice; if (maxPrice) where.price.lte = maxPrice; }
    if (condition) where.condition = condition;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = country;

    const [data, total] = await Promise.all([
      this.prisma.usedVehicle.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includes,
      }),
      this.prisma.usedVehicle.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.usedVehicle.findUnique({ where: { id }, include: this.includes });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.prisma.usedVehicle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return vehicle;
  }

  async create(userId: string, data: any) {
    const { images, features, ...vehicleData } = data;
    return this.prisma.usedVehicle.create({
      data: {
        ...vehicleData,
        sellerId: userId,
        images: images?.length ? { createMany: { data: images.map((url: string, i: number) => ({ url, isMain: i === 0, order: i })) } } : undefined,
        features: features?.length ? { createMany: { data: features.map((f: string) => ({ feature: f })) } } : undefined,
      },
      include: this.includes,
    });
  }

  async update(userId: string, id: string, data: any) {
    const vehicle = await this.prisma.usedVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.sellerId !== userId) throw new ForbiddenException();

    const { images, features, ...vehicleData } = data;
    if (images) {
      await this.prisma.usedVehicleImage.deleteMany({ where: { vehicleId: id } });
      await this.prisma.usedVehicleImage.createMany({ data: images.map((url: string, i: number) => ({ vehicleId: id, url, isMain: i === 0, order: i })) });
    }
    if (features) {
      await this.prisma.usedVehicleFeature.deleteMany({ where: { vehicleId: id } });
      await this.prisma.usedVehicleFeature.createMany({ data: features.map((f: string) => ({ vehicleId: id, feature: f })) });
    }
    return this.prisma.usedVehicle.update({ where: { id }, data: vehicleData, include: this.includes });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.usedVehicle.update({ where: { id }, data: { status: status as any } });
  }

  async remove(userId: string, id: string) {
    const vehicle = await this.prisma.usedVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.sellerId !== userId) throw new ForbiddenException();
    await this.prisma.usedVehicle.update({ where: { id }, data: { status: 'REMOVED' } });
    return { message: 'Listing removed' };
  }

  async getMyListings(userId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const where = { sellerId: userId };
    const [data, total] = await Promise.all([
      this.prisma.usedVehicle.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: this.includes }),
      this.prisma.usedVehicle.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }
}
