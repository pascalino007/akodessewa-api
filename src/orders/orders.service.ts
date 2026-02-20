import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private orderIncludes = {
    items: { include: { product: { include: { images: { where: { isMain: true }, take: 1 } } } } },
    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    shop: { select: { id: true, name: true, slug: true } },
    address: true,
    payment: true,
    deliveryPerson: true,
    statusHistory: { orderBy: { createdAt: 'desc' as const } },
  };

  async findAll(query: any, userId?: string, role?: string) {
    const { page = 1, limit = 20, status, shopId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = {};

    if (role === 'CUSTOMER') where.userId = userId;
    else if (role === 'SUPPLIER') {
      const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
      if (shop) where.shopId = shop.id;
    }

    if (status) where.status = status;
    if (shopId) where.shopId = shopId;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: this.orderIncludes,
      }),
      this.prisma.order.count({ where }),
    ]);
    return new PaginatedResult(data, total, page, limit);
  }

  async findOne(idOrToken: string, userId?: string, role?: string) {
    // Support lookup by UUID (id) or by order number (token e.g. AKO-XXX)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrToken);
    const order = await this.prisma.order.findUnique({
      where: isUuid ? { id: idOrToken } : { orderNumber: idOrToken },
      include: this.orderIncludes,
    });
    if (!order) throw new NotFoundException('Order not found');

    // Access control
    if (role === 'CUSTOMER' && order.userId !== userId) throw new ForbiddenException();
    if (role === 'SUPPLIER') {
      const shop = await this.prisma.shop.findUnique({ where: { ownerId: userId } });
      if (!shop || order.shopId !== shop.id) throw new ForbiddenException();
    }

    return order;
  }

  async create(userId: string, data: any) {
    const {
      items,
      addressId,
      shippingAddress,
      notes,
      comment,
      shopId,
      paymentMethod,
    } = data;

    if (!items?.length) throw new BadRequestException('Order must have at least one item');

    // Resolve address: use addressId or create from inline shippingAddress (frontend checkout)
    let resolvedAddressId = addressId;
    if (!resolvedAddressId && shippingAddress && (shippingAddress.address1 || shippingAddress.street)) {
      const addr = await this.prisma.address.create({
        data: {
          userId,
          street: shippingAddress.address1 || shippingAddress.street || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state ?? null,
          country: shippingAddress.country || '',
          zipCode: shippingAddress.postcode ?? shippingAddress.zipCode ?? null,
          label: 'Order shipping',
        },
      });
      resolvedAddressId = addr.id;
    }

    const notesText = notes ?? comment ?? null;

    // Validate products and calculate totals (productId may be string or number from frontend)
    let subtotal = 0;
    let resolvedShopId = shopId;
    const orderItems: { productId: string; quantity: number; price: any; total: number }[] = [];
    for (const item of items) {
      const productId = String(item.productId);
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new BadRequestException(`Product ${productId} not found or inactive`);
      if (product.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.name}`);

      if (!resolvedShopId) resolvedShopId = product.shopId;

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
      });
    }

    if (!resolvedShopId) throw new BadRequestException('Could not determine shop for this order');

    const orderNumber = `AKO-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 4).toUpperCase()}`;
    const shippingFee = data.shippingFee || 0;
    const discount = data.discount || 0;
    const tax = subtotal * 0.0; // No tax for now
    const total = subtotal + shippingFee - discount + tax;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        shopId: resolvedShopId,
        addressId: resolvedAddressId,
        subtotal,
        shippingFee,
        discount,
        tax,
        total,
        notes: notesText,
        items: { createMany: { data: orderItems } },
        statusHistory: {
          create: { status: 'PENDING', note: 'Order placed', changedBy: userId },
        },
      },
      include: this.orderIncludes,
    });

    // Create payment record if method provided
    const method = this.normalizePaymentMethod(paymentMethod);
    if (method) {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          currency: order.currency,
          method: method as any,
          status: 'PENDING',
        },
      });
    }

    // Decrement stock
    for (const item of items) {
      await this.prisma.product.update({
        where: { id: String(item.productId) },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: this.orderIncludes,
    }) as Promise<any>;
  }

  private normalizePaymentMethod(value: string | undefined): string | null {
    if (!value) return null;
    const upper = value.toUpperCase().replace(/-/g, '_');
    const allowed = ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'CASH_ON_DELIVERY', 'WALLET'];
    return allowed.includes(upper) ? upper : null;
  }

  async updateStatus(id: string, userId: string, role: string, status: string, note?: string) {
    const order = await this.findOne(id, userId, role);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['IN_TRANSIT'],
      IN_TRANSIT: ['DELIVERED'],
      DELIVERED: ['RETURNED'],
      CANCELLED: [],
      REFUNDED: [],
      RETURNED: ['REFUNDED'],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        cancelReason: status === 'CANCELLED' ? note : undefined,
        statusHistory: {
          create: { status: status as any, note, changedBy: userId },
        },
      },
      include: this.orderIncludes,
    });

    // Restore stock if cancelled
    if (status === 'CANCELLED') {
      for (const item of order.items) {
        if (item.status === 'ACTIVE') {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return updated;
  }

  async cancelItem(orderId: string, itemId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shop: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found');
    if (item.status !== 'ACTIVE') throw new BadRequestException('Item already cancelled');

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 'CANCELLED', cancelReason: reason },
    });

    // Restore stock
    await this.prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });

    // Recalculate total
    const activeItems = order.items.filter((i) => i.id !== itemId && i.status === 'ACTIVE');
    const newSubtotal = activeItems.reduce((sum, i) => sum + Number(i.total), 0);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal: newSubtotal, total: newSubtotal + Number(order.shippingFee) - Number(order.discount) },
    });

    return { message: 'Item cancelled' };
  }

  async assignDelivery(orderId: string, deliveryPersonId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPersonId },
      include: this.orderIncludes,
    });
  }
}
