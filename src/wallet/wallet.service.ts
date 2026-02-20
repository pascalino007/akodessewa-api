import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getMyWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string, query: any) {
    const { page = 1, limit = 20, type, status } = query;
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const where: any = { walletId: wallet.id };
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async requestWithdrawal(userId: string, data: { amount: number; description?: string }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.balance) < data.amount) throw new BadRequestException('Insufficient balance');

    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: data.amount } },
    });

    return this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: data.amount,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        description: data.description || 'Withdrawal request',
      },
    });
  }

  async processWithdrawal(transactionId: string, status: 'COMPLETED' | 'FAILED') {
    const tx = await this.prisma.walletTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (status === 'FAILED') {
      // Refund balance
      await this.prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: tx.amount } },
      });
    }

    return this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { status },
    });
  }

  // Admin: list all wallets
  async findAllWallets(query: any) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { balance: 'desc' },
      }),
      this.prisma.wallet.count(),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }
}
