import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List used vehicles' })
  findAll(@Query() query: any) { return this.marketplaceService.findAll(query); }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get used vehicle by ID' })
  findOne(@Param('id') id: string) { return this.marketplaceService.findOne(id); }

  @ApiBearerAuth()
  @Get('my/listings')
  @ApiOperation({ summary: 'Get my vehicle listings' })
  getMyListings(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.marketplaceService.getMyListings(userId, query);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create used vehicle listing' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.marketplaceService.create(userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle listing' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) {
    return this.marketplaceService.update(userId, id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update listing status (admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.marketplaceService.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Remove vehicle listing' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.marketplaceService.remove(userId, id);
  }
}
