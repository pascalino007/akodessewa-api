import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('me')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get my wallet' })
  getMyWallet(@CurrentUser('id') userId: string) { return this.walletService.getMyWallet(userId); }

  @Get('me/transactions')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Get my wallet transactions' })
  getTransactions(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.walletService.getTransactions(userId, query);
  }

  @Post('withdraw')
  @Roles(Role.SUPPLIER)
  @ApiOperation({ summary: 'Request withdrawal' })
  requestWithdrawal(@CurrentUser('id') userId: string, @Body() dto: { amount: number; description?: string }) {
    return this.walletService.requestWithdrawal(userId, dto);
  }

  @Get('all')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'List all wallets (admin)' })
  findAll(@Query() query: any) { return this.walletService.findAllWallets(query); }

  @Patch('transactions/:id/process')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Process withdrawal (admin)' })
  processWithdrawal(@Param('id') id: string, @Body() dto: { status: 'COMPLETED' | 'FAILED' }) {
    return this.walletService.processWithdrawal(id, dto.status);
  }
}
