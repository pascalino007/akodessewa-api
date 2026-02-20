import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMyRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOrCreateDirectRoom(userId: string, otherUserId: string) {
    // Check if direct room exists
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (existing) return existing;

    return this.prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        participants: {
          createMany: { data: [{ userId }, { userId: otherUserId }] },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
      },
    });
  }

  async getRoomMessages(userId: string, roomId: string, page = 1, limit = 50) {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { roomId, userId },
    });
    if (!participant) throw new ForbiddenException('Not a member of this room');

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    // Mark as read
    await this.prisma.chatMessage.updateMany({
      where: { roomId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return messages.reverse();
  }

  async sendMessage(userId: string, roomId: string, content: string, type = 'TEXT', fileUrl?: string) {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { roomId, userId },
    });
    if (!participant) throw new ForbiddenException('Not a member of this room');

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        content,
        type: type as any,
        fileUrl,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    // Update room timestamp
    await this.prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });

    return message;
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        room: { participants: { some: { userId } } },
      },
    });
    return { unreadCount: count };
  }
}
