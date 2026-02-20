import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchByVin(vin: string) {
    if (!vin || vin.length !== 17) {
      throw new BadRequestException('VIN must be exactly 17 characters');
    }

    // Check cache first
    const cached = await this.prisma.vinLookup.findUnique({ where: { vin: vin.toUpperCase() } });
    if (cached) {
      const carData = cached.data as any;
      // Find compatible parts
      const parts = await this.findPartsByCarInfo(carData.make, carData.model, carData.year);
      return { vehicle: carData, parts, source: 'cache' };
    }

    // Decode VIN using NHTSA API (free, no key needed)
    const decoded = await this.decodeVinNhtsa(vin);

    // Cache the result
    await this.prisma.vinLookup.create({
      data: { vin: vin.toUpperCase(), data: decoded },
    });

    // Find compatible parts
    const parts = await this.findPartsByCarInfo(decoded.make, decoded.model, decoded.year);
    return { vehicle: decoded, parts, source: 'nhtsa' };
  }

  private searchProductInclude = {
    images: { orderBy: { order: 'asc' as const } },
    specifications: true,
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    shop: {
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        country: true,
        lat: true,
        lng: true,
      },
    },
    compatibleCars: { include: { car: true } },
    _count: { select: { reviews: true, orderItems: true } },
  };

  async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<any>> {
    if (!query || query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const where = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { partNumber: { contains: query, mode: 'insensitive' as const } },
        { oemNumber: { contains: query, mode: 'insensitive' as const } },
        { sku: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
        { brand: { name: { contains: query, mode: 'insensitive' as const } } },
        { category: { name: { contains: query, mode: 'insensitive' as const } } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.searchProductInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async advancedSearch(filters: {
    query?: string;
    make?: string;
    model?: string;
    year?: number;
    categoryId?: string;
    vehicleType?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const where: any = { isActive: true };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' as const } },
        { partNumber: { contains: filters.query, mode: 'insensitive' as const } },
        { oemNumber: { contains: filters.query, mode: 'insensitive' as const } },
      ];
    }

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.vehicleType) where.vehicleType = filters.vehicleType;

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    // Filter by compatible car
    if (filters.make || filters.model || filters.year) {
      const carWhere: any = {};
      if (filters.make) carWhere.make = { equals: filters.make, mode: 'insensitive' as const };
      if (filters.model) carWhere.model = { equals: filters.model, mode: 'insensitive' as const };
      if (filters.year) carWhere.year = filters.year;

      where.compatibleCars = { some: { car: carWhere } };
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 50,
      orderBy: { salesCount: 'desc' },
      include: {
        images: { where: { isMain: true }, take: 1 },
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
        compatibleCars: { include: { car: { select: { make: true, model: true, year: true } } } },
      },
    });

    return products;
  }

  async getSuggestions(query: string) {
    if (!query || query.length < 2) return [];

    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true, name: { contains: query, mode: 'insensitive' as const } },
        select: { name: true, slug: true },
        take: 5,
      }),
      this.prisma.category.findMany({
        where: { isActive: true, name: { contains: query, mode: 'insensitive' as const } },
        select: { name: true, slug: true },
        take: 3,
      }),
      this.prisma.brand.findMany({
        where: { isActive: true, name: { contains: query, mode: 'insensitive' as const } },
        select: { name: true, slug: true },
        take: 3,
      }),
    ]);

    return {
      products: products.map((p) => ({ type: 'product', ...p })),
      categories: categories.map((c) => ({ type: 'category', ...c })),
      brands: brands.map((b) => ({ type: 'brand', ...b })),
    };
  }

  private async decodeVinNhtsa(vin: string): Promise<any> {
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`,
      );
      const data = await response.json();
      const result = data.Results?.[0] || {};

      return {
        vin: vin.toUpperCase(),
        make: result.Make || '',
        model: result.Model || '',
        year: parseInt(result.ModelYear) || 0,
        trim: result.Trim || '',
        engine: result.DisplacementL ? `${result.DisplacementL}L ${result.EngineCylinders}cyl` : '',
        fuelType: result.FuelTypePrimary || '',
        transmission: result.TransmissionStyle || '',
        bodyType: result.BodyClass || '',
        driveType: result.DriveType || '',
        doors: result.Doors || '',
        plantCountry: result.PlantCountry || '',
      };
    } catch (error) {
      return { vin: vin.toUpperCase(), error: 'Failed to decode VIN' };
    }
  }

  private async findPartsByCarInfo(make: string, model: string, year: number) {
    if (!make || !model || !year) return [];

    return this.prisma.product.findMany({
      where: {
        isActive: true,
        compatibleCars: {
          some: {
            car: {
              make: { equals: make, mode: 'insensitive' as const },
              model: { equals: model, mode: 'insensitive' as const },
              year,
            },
          },
        },
      },
      take: 20,
      include: {
        images: { where: { isMain: true }, take: 1 },
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
  }
}
