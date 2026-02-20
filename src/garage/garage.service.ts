import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GarageService {
  constructor(private prisma: PrismaService) {}

  async getMyVehicles(userId: string) {
    return this.prisma.garageVehicle.findMany({
      where: { userId },
      include: { car: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async addVehicle(userId: string, data: any) {
    if (data.isDefault) {
      await this.prisma.garageVehicle.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.garageVehicle.create({
      data: { ...data, userId },
      include: { car: true },
    });
  }

  async updateVehicle(userId: string, id: string, data: any) {
    const vehicle = await this.prisma.garageVehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found in your garage');
    if (data.isDefault) {
      await this.prisma.garageVehicle.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.garageVehicle.update({ where: { id }, data, include: { car: true } });
  }

  async removeVehicle(userId: string, id: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found in your garage');
    await this.prisma.garageVehicle.delete({ where: { id } });
    return { message: 'Vehicle removed from garage' };
  }

  async getCompatibleParts(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: { id: vehicleId, userId },
      include: { car: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        compatibleCars: { some: { carId: vehicle.carId } },
      },
      take: 30,
      include: {
        images: { where: { isMain: true }, take: 1 },
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
      },
    });
  }
}
