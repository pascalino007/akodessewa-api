import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ShopsService } from './shops.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all shops' })
  findAll(@Query() query: any) { return this.shopsService.findAll(query); }

  @ApiBearerAuth()
  @Get('me')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get my shop (supplier)' })
  getMyShop(@CurrentUser('id') userId: string) { return this.shopsService.getMyShop(userId); }

  @ApiBearerAuth()
  @Patch('me')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Update my shop (supplier)' })
  updateMyShop(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.shopsService.updateMyShop(userId, dto);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get shop by slug' })
  findBySlug(@Param('slug') slug: string) { return this.shopsService.findBySlug(slug); }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  findOne(@Param('id') id: string) { return this.shopsService.findOne(id); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Admin update shop' })
  adminUpdate(@Param('id') id: string, @Body() dto: any) { return this.shopsService.adminUpdate(id, dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a shop (admin)' })
  verifyShop(@Param('id') id: string) { return this.shopsService.verifyShop(id); }
}
