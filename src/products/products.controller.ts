import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, VehicleType, ProductCondition } from '@prisma/client';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, IsInt, Min } from 'class-validator';
import { PaginationDto } from '../common/dto/pagination.dto';

class QueryProductsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() carId?: string;
  @ApiPropertyOptional({ enum: VehicleType }) @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @ApiPropertyOptional({ enum: ProductCondition }) @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
}

class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() oemNumber?: string;
  @ApiProperty() @IsNumber() price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() comparePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stock?: number;
  @ApiPropertyOptional({ enum: ProductCondition }) @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @ApiPropertyOptional({ enum: VehicleType }) @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @ApiPropertyOptional() @IsOptional() @IsString() material?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warranty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() images?: { url: string; alt?: string }[];
  @ApiPropertyOptional() @IsOptional() @IsArray() specifications?: { key: string; value: string }[];
  @ApiPropertyOptional() @IsOptional() @IsArray() compatibleCarIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  getFeatured(@Query('limit') limit?: number) {
    return this.productsService.getFeatured(limit);
  }

  @Public()
  @Get('central/unassigned')
  @ApiOperation({ summary: 'Get unassigned products from central database' })
  getUnassigned(@Query() query: any) {
    return this.productsService.getUnassignedProducts(query);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.MANAGER)
  @Get('my')
  @ApiOperation({ summary: 'Get my products (authenticated supplier)' })
  getMyProducts(@CurrentUser('id') userId: string, @Query() query: PaginationDto) {
    return this.productsService.getMyProducts(userId, query);
  }

  @Public()
  @Get('shop/:shopId')
  @ApiOperation({ summary: 'Get products by shop' })
  getByShop(@Param('shopId') shopId: string, @Query() query: PaginationDto) {
    return this.productsService.getByShop(shopId, query);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.productsService.getRelated(id, limit);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim an unassigned product for your shop' })
  claim(
    @CurrentUser('id') userId: string, 
    @Param('id') id: string,
    @Body() body: { price?: number; quantity?: number }
  ) {
    return this.productsService.claimProduct(userId, id, body.price, body.quantity);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create product (supplier/admin)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(userId, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update product (supplier/admin)' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(userId, id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate product' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.productsService.remove(userId, id);
  }
}
