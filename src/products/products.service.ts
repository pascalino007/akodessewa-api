import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { VehicleType, ProductCondition } from '@prisma/client';
import slugify from 'slugify';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private productIncludes = {
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

  async findAll(query: any) {
    const {
      page = 1, limit = 20, search, categoryId, brandId, shopId,
      vehicleType, condition, minPrice, maxPrice, isFeatured,
      sortBy: rawSortBy = 'createdAt', sortOrder = 'desc', carId,
    } = query;

    const sortMap: Record<string, string> = {
      newest: 'createdAt',
      popular: 'salesCount',
      rating: 'rating',
      price_asc: 'price',
      price_desc: 'price',
    };
    const sortBy = sortMap[rawSortBy] || rawSortBy;
    const finalSortOrder = rawSortBy === 'price_asc' ? 'asc' : rawSortBy === 'price_desc' ? 'desc' : sortOrder;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { oemNumber: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (shopId) where.shopId = shopId;
    if (vehicleType) where.vehicleType = vehicleType;
    if (condition) where.condition = condition;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }
    if (carId) {
      where.compatibleCars = { some: { carId } };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: finalSortOrder },
        include: this.productIncludes,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productIncludes,
    });
    if (!product) throw new NotFoundException('Product not found');

    // Increment view count
    await this.prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.productIncludes,
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } });
    return product;
  }

  async create(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // Only suppliers need a shop to create products
    // Admins and managers can create products without a shop
    let shopId: string | undefined;
    if (user?.role === 'SUPPLIER') {
      const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
      if (!shop) throw new ForbiddenException('You must have a shop to create products');
      shopId = shop.id;
    }

    const slug = slugify(data.name, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);

    const { images, specifications, compatibleCarIds, ...productData } = data;

    // Validate foreign keys exist
    if (productData.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: String(productData.categoryId) } });
      if (!category) throw new NotFoundException(`Category with ID ${productData.categoryId} not found`);
    }
    if (productData.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: String(productData.brandId) } });
      if (!brand) throw new NotFoundException(`Brand with ID ${productData.brandId} not found`);
    }
    if (compatibleCarIds?.length) {
      const cars = await this.prisma.car.findMany({ where: { id: { in: compatibleCarIds } } });
      if (cars.length !== compatibleCarIds.length) {
        const foundIds = cars.map(c => c.id);
        const missingIds = compatibleCarIds.filter((id: string) => !foundIds.includes(id));
        throw new NotFoundException(`Car IDs not found: ${missingIds.join(', ')}`);
      }
    }

    // Cast enum strings to proper types
    const createData: any = {
      ...productData,
      slug,
      shopId: shopId || undefined,
      categoryId: productData.categoryId ? String(productData.categoryId) : undefined,
      vehicleType: productData.vehicleType as VehicleType,
      condition: productData.condition as ProductCondition,
    };

    const product = await this.prisma.product.create({
      data: {
        ...createData,
        images: images?.length ? {
          createMany: { data: images.map((img: any, i: number) => ({ url: img.url, alt: img.alt, isMain: i === 0, order: i })) },
        } : undefined,
        specifications: specifications?.length ? {
          createMany: { data: specifications },
        } : undefined,
        compatibleCars: compatibleCarIds?.length ? {
          createMany: { data: compatibleCarIds.map((carId: string) => ({ carId })) },
        } : undefined,
      },
      include: this.productIncludes,
    });

    return product;
  }

  async update(userId: string, id: string, data: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true, parent: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check ownership (supplier can only edit their own)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'SUPPLIER' && product.shop?.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own products');
    }

    const { images, specifications, compatibleCarIds, ...productData } = data;

    // If this is a clone, only allow editing price and comparePrice
    if (product.isClone) {
      const allowedFields = ['price', 'comparePrice', 'stock'];
      const filteredData: any = {};
      for (const key of allowedFields) {
        if (productData[key] !== undefined) {
          filteredData[key] = productData[key];
        }
      }
      return this.prisma.product.update({
        where: { id },
        data: filteredData,
        include: this.productIncludes,
      });
    }

    if (productData.name) {
      productData.slug = slugify(productData.name, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);
    }

    // Update images if provided
    if (images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      await this.prisma.productImage.createMany({
        data: images.map((img: any, i: number) => ({ productId: id, url: img.url, alt: img.alt, isMain: i === 0, order: i })),
      });
    }

    // Update specifications if provided
    if (specifications) {
      await this.prisma.productSpecification.deleteMany({ where: { productId: id } });
      await this.prisma.productSpecification.createMany({
        data: specifications.map((s: any) => ({ productId: id, ...s })),
      });
    }

    // Update compatible cars if provided
    if (compatibleCarIds) {
      await this.prisma.productCompatibility.deleteMany({ where: { productId: id } });
      await this.prisma.productCompatibility.createMany({
        data: compatibleCarIds.map((carId: string) => ({ productId: id, carId })),
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: this.productIncludes,
    });
  }

  async remove(userId: string, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'SUPPLIER' && product.shop?.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { message: 'Product deactivated' };
  }

  async cloneProduct(userId: string, productId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // Only suppliers can clone products
    if (user?.role !== 'SUPPLIER') {
      throw new ForbiddenException('Only suppliers can clone products');
    }

    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new ForbiddenException('You must have a shop to clone products');

    const original = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, specifications: true, compatibleCars: true },
    });
    if (!original) throw new NotFoundException('Product not found');

    // Check if already cloned
    const existingClone = await this.prisma.product.findFirst({
      where: { parentId: productId, shopId: shop.id },
    });
    if (existingClone) {
      throw new ForbiddenException('You have already cloned this product');
    }

    const slug = slugify(original.name, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);

    const clone = await this.prisma.product.create({
      data: {
        name: original.name,
        slug,
        description: original.description,
        sku: original.sku ? original.sku + '-CLONE-' + uuid().slice(0, 4) : null,
        partNumber: original.partNumber,
        oemNumber: original.oemNumber,
        price: original.price,
        comparePrice: original.comparePrice,
        cost: original.cost,
        currency: original.currency,
        stock: 0,
        minStock: original.minStock,
        weight: original.weight,
        condition: original.condition,
        vehicleType: original.vehicleType,
        material: original.material,
        color: original.color,
        countryOfOrigin: original.countryOfOrigin,
        warranty: original.warranty,
        isActive: true,
        isFeatured: false,
        categoryId: original.categoryId,
        brandId: original.brandId,
        shopId: shop.id,
        parentId: original.id,
        isClone: true,
        images: original.images?.length ? {
          createMany: { data: original.images.map((img, i) => ({ url: img.url, alt: img.alt, isMain: i === 0, order: i })) },
        } : undefined,
        specifications: original.specifications?.length ? {
          createMany: { data: original.specifications.map((s) => ({ key: s.key, value: s.value })) },
        } : undefined,
        compatibleCars: original.compatibleCars?.length ? {
          createMany: { data: original.compatibleCars.map((c) => ({ carId: c.carId })) },
        } : undefined,
      },
      include: this.productIncludes,
    });

    return clone;
  }

  async getByShop(shopId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const where = { shopId, isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.productIncludes,
      }),
      this.prisma.product.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async getMyProducts(userId: string, query: any) {
    const { page = 1, limit = 20, search, status } = query;
    
    // Get the supplier's shop
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) {
      throw new ForbiddenException('You must have a shop to view products');
    }

    const where: any = { 
      shopId: shop.id,
      isActive: true,
    };
    
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: this.productIncludes,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResult(data, total, pageNum, limitNum);
  }

  async getFeatured(limit = 12) {
    return this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: limit,
      orderBy: { salesCount: 'desc' },
      include: this.productIncludes,
    });
  }

  async getRelated(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { brandId: product.brandId },
        ],
      },
      take: limit,
      orderBy: { salesCount: 'desc' },
      include: this.productIncludes,
    });
  }

  /**
   * Get products with null shopId (unassigned products in central database)
   */
  async getUnassignedProducts(query: any) {
    const { page = 1, limit = 20, search, categoryId, brandId } = query;

    // Parse pagination params to integers
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;

    // Build where clause for products without a shop
    const where: any = { 
      isActive: true,
      isClone: false,
      shop: { is: null }
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { oemNumber: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: this.productIncludes,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new PaginatedResult(data, total, pageNum, limitNum);
  }

  /**
   * Claim an unassigned product for a supplier's shop
   */
  async claimProduct(userId: string, productId: string, supplierPrice?: number, supplierQuantity?: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'SUPPLIER') {
      throw new ForbiddenException('Only suppliers can claim products');
    }

    const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
    if (!shop) throw new ForbiddenException('You must have a shop to claim products');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, specifications: true, compatibleCars: true },
    });
    
    if (!product) throw new NotFoundException('Product not found');
    
    // Check if this is a central database product (unassigned)
    if (product.shopId !== null && !product.isClone) {
      throw new ForbiddenException('This product is already assigned to a shop');
    }

    // Check if this supplier has already cloned this product
    const existingClone = await this.prisma.product.findFirst({
      where: { 
        parentId: productId, 
        shopId: shop.id,
        isClone: true 
      },
    });
    if (existingClone) {
      throw new ForbiddenException('You have already added this product to your shop');
    }

    // Create a clone for the supplier's shop
    const slug = slugify(product.name, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);

    // Use supplier's price if provided, otherwise use original price
    const finalPrice = supplierPrice !== undefined && supplierPrice > 0 
      ? supplierPrice 
      : product.price;
    
    // Use supplier's quantity if provided, otherwise start with 0
    const finalStock = supplierQuantity !== undefined && supplierQuantity >= 0
      ? supplierQuantity
      : 0;

    const claimedProduct = await this.prisma.product.create({
      data: {
        name: product.name,
        slug,
        description: product.description,
        sku: product.sku ? product.sku + '-' + uuid().slice(0, 4) : null,
        partNumber: product.partNumber,
        oemNumber: product.oemNumber,
        price: finalPrice,
        comparePrice: product.comparePrice,
        cost: product.cost,
        currency: product.currency,
        stock: finalStock,
        minStock: product.minStock,
        weight: product.weight,
        condition: product.condition,
        vehicleType: product.vehicleType,
        material: product.material,
        color: product.color,
        countryOfOrigin: product.countryOfOrigin,
        warranty: product.warranty,
        isActive: true,
        isFeatured: false,
        categoryId: product.categoryId,
        brandId: product.brandId,
        shopId: shop.id,
        parentId: product.id,
        isClone: true,
        images: product.images?.length ? {
          createMany: { data: product.images.map((img, i) => ({ url: img.url, alt: img.alt, isMain: i === 0, order: i })) },
        } : undefined,
        specifications: product.specifications?.length ? {
          createMany: { data: product.specifications.map((s) => ({ key: s.key, value: s.value })) },
        } : undefined,
        compatibleCars: product.compatibleCars?.length ? {
          createMany: { data: product.compatibleCars.map((c) => ({ carId: c.carId })) },
        } : undefined,
      },
      include: this.productIncludes,
    });

    return claimedProduct;
  }
}
