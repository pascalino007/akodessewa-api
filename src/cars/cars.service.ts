import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { VehicleType } from '@prisma/client';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, make, model, year, vehicleType, fuelType, transmission } = query;
    const where: any = { isActive: true };
    if (make) where.make = { contains: make, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (year) where.year = year;
    if (vehicleType) where.vehicleType = vehicleType;
    if (fuelType) where.fuelType = fuelType;
    if (transmission) where.transmission = transmission;

    const [data, total] = await Promise.all([
      this.prisma.car.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ year: 'desc' }, { make: 'asc' }],
        include: { _count: { select: { compatibleProducts: true, garageEntries: true } } },
      }),
      this.prisma.car.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const car = await this.prisma.car.findUnique({
      where: { id },
      include: {
        compatibleProducts: { include: { product: { include: { images: true, brand: true } } } },
        _count: { select: { compatibleProducts: true, garageEntries: true } },
      },
    });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async create(data: any) {
    return this.prisma.car.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.car.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.car.update({ where: { id }, data: { isActive: false } });
    return { message: 'Car deactivated' };
  }

  async getByType(vehicleType: string) {
    const cars = await this.prisma.car.findMany({
      where: { vehicleType: vehicleType as VehicleType, isActive: true },
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }],
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        trim: true,
        vehicleType: true,
      },
    });

    // Group by make, then by model
    const grouped = cars.reduce((acc, car) => {
      if (!acc[car.make]) {
        acc[car.make] = {};
      }
      if (!acc[car.make][car.model]) {
        acc[car.make][car.model] = [];
      }
      acc[car.make][car.model].push({
        id: car.id,
        year: car.year,
        trim: car.trim,
      });
      return acc;
    }, {} as Record<string, Record<string, Array<{ id: string; year: number; trim: string | null }>>>);

    return {
      vehicleType,
      count: cars.length,
      makes: Object.keys(grouped).sort(),
      data: grouped,
    };
  }

  async getMakes(vehicleType?: string) {
    const where: any = { isActive: true };
    if (vehicleType) where.vehicleType = vehicleType;
    const result = await this.prisma.car.findMany({
      where,
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    });
    return result.map((r) => r.make);
  }

  async getModels(make: string, vehicleType?: string) {
    const where: any = { make: { equals: make, mode: 'insensitive' }, isActive: true };
    if (vehicleType) where.vehicleType = vehicleType;
    const result = await this.prisma.car.findMany({
      where,
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    });
    return result.map((r) => r.model);
  }

  async getYears(make: string, model: string, vehicleType?: string) {
    const where: any = {
      make: { equals: make, mode: 'insensitive' },
      model: { equals: model, mode: 'insensitive' },
      isActive: true,
    };
    if (vehicleType) where.vehicleType = vehicleType;
    const result = await this.prisma.car.findMany({
      where,
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });
    return result.map((r) => r.year);
  }

  async getTrims(make: string, model: string, year: number, vehicleType?: string) {
    const where: any = {
      make: { equals: make, mode: 'insensitive' },
      model: { equals: model, mode: 'insensitive' },
      year,
      isActive: true,
    };
    if (vehicleType) where.vehicleType = vehicleType;
    return this.prisma.car.findMany({
      where,
      orderBy: { trim: 'asc' },
    });
  }

  async getAllYears(vehicleType?: string) {
    const where: any = { isActive: true };
    if (vehicleType) where.vehicleType = vehicleType;
    const result = await this.prisma.car.findMany({
      where,
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });
    return result.map((r) => r.year);
  }
}
