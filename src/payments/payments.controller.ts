import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'List all payments (admin)' })
  findAll(@Query() query: any) { return this.paymentsService.findAll(query); }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  findOne(@Param('id') id: string) { return this.paymentsService.findOne(id); }

  @Post('order/:orderId')
  @ApiOperation({ summary: 'Create payment for order' })
  create(@Param('orderId') orderId: string, @Body() dto: any) {
    return this.paymentsService.createPayment(orderId, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Update payment status' })
  updateStatus(@Param('id') id: string, @Body() dto: { status: string; providerRef?: string }) {
    return this.paymentsService.updateStatus(id, dto.status, dto.providerRef);
  }
}
