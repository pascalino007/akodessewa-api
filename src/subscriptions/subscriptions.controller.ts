import { Controller, Get, Post, Patch, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get my subscription' })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  @Post('change-plan')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Change subscription plan' })
  changePlan(@CurrentUser('id') userId: string, @Body() dto: { plan: 'BASIC' | 'PREMIUM' | 'VIP' }) {
    return this.subscriptionsService.changePlan(userId, dto.plan);
  }

  @Patch('cancel')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Cancel subscription' })
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all subscriptions (admin)' })
  findAll(@Query() query: any) { return this.subscriptionsService.findAll(query); }
}
