import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders (filtered by role)' })
  findAll(@Query() query: any, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.ordersService.findAll(query, userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.ordersService.findOne(id, userId, role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.ordersService.create(userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: { status: string; note?: string },
  ) {
    return this.ordersService.updateStatus(id, userId, role, dto.status, dto.note);
  }

  @Patch(':id/items/:itemId/cancel')
  @ApiOperation({ summary: 'Cancel a single order item' })
  cancelItem(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.ordersService.cancelItem(orderId, itemId, userId, dto.reason);
  }

  @Patch(':id/assign-delivery')
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.LOGISTICS)
  @ApiOperation({ summary: 'Assign delivery person to order' })
  assignDelivery(@Param('id') id: string, @Body() dto: { deliveryPersonId: string }) {
    return this.ordersService.assignDelivery(id, dto.deliveryPersonId);
  }
}
