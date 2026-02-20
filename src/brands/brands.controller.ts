import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BrandsService } from './brands.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class CreateBrandDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}

class UpdateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all brands' })
  findAll() { return this.brandsService.findAll(); }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  findOne(@Param('id') id: string) { return this.brandsService.findOne(id); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create brand (admin)' })
  create(@Body() dto: CreateBrandDto) { return this.brandsService.create(dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update brand (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) { return this.brandsService.update(id, dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate brand (admin)' })
  remove(@Param('id') id: string) { return this.brandsService.remove(id); }
}
