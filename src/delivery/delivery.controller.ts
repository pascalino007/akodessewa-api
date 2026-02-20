import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('me')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get my delivery personnel' })
  getMyPersonnel(@CurrentUser('id') userId: string) { return this.deliveryService.getMyDeliveryPersonnel(userId); }

  @Post()
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Register delivery person' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) { return this.deliveryService.create(userId, dto); }

  @Patch(':id')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Update delivery person' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) { return this.deliveryService.update(userId, id, dto); }

  @Delete(':id')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Deactivate delivery person' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.deliveryService.remove(userId, id); }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICS)
  @ApiOperation({ summary: 'List all delivery personnel (admin)' })
  findAll(@Query() query: any) { return this.deliveryService.findAll(query); }
}
