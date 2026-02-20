import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get active promotions' })
  getActive() { return this.promotionsService.getActive(); }

  @Public()
  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate promotion code' })
  validateCode(@Param('code') code: string) { return this.promotionsService.validateCode(code); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @Get()
  @ApiOperation({ summary: 'List all promotions' })
  findAll(@Query() query: any) { return this.promotionsService.findAll(query); }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  findOne(@Param('id') id: string) { return this.promotionsService.findOne(id); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @Post()
  @ApiOperation({ summary: 'Create promotion' })
  create(@Body() dto: any) { return this.promotionsService.create(dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPLIER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update promotion' })
  update(@Param('id') id: string, @Body() dto: any) { return this.promotionsService.update(id, dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate promotion' })
  remove(@Param('id') id: string) { return this.promotionsService.remove(id); }
}
