import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, AdminUpdateUserDto, QueryUsersDto, CreateAddressDto, UpdateAddressDto } from './dto/users.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 20, search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true, email: true, phone: true, firstName: true, lastName: true,
          avatar: true, role: true, isActive: true, isVerified: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, language: true, currency: true,
        isActive: true, isVerified: true, createdAt: true, updatedAt: true,
        addresses: true,
        shop: { select: { id: true, name: true, slug: true } },
        subscription: { select: { plan: true, status: true, endDate: true } },
        _count: { select: { orders: true, reviews: true, garage: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, language: true, currency: true, updatedAt: true,
      },
    });
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: 'User deactivated' };
  }

  // ── Addresses ──
  async getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: 'Address deleted' };
  }
}
