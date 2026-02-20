import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get my chat rooms' })
  getMyRooms(@CurrentUser('id') userId: string) { return this.chatService.getMyRooms(userId); }

  @Post('rooms/direct/:otherUserId')
  @ApiOperation({ summary: 'Get or create direct chat room' })
  getOrCreateRoom(@CurrentUser('id') userId: string, @Param('otherUserId') otherUserId: string) {
    return this.chatService.getOrCreateDirectRoom(userId, otherUserId);
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get room messages' })
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('roomId') roomId: string,
    @Query('page') page?: number,
  ) {
    return this.chatService.getRoomMessages(userId, roomId, page);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Send a message (REST fallback)' })
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('roomId') roomId: string,
    @Body() dto: { content: string; type?: string; fileUrl?: string },
  ) {
    return this.chatService.sendMessage(userId, roomId, dto.content, dto.type, dto.fileUrl);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  getUnreadCount(@CurrentUser('id') userId: string) { return this.chatService.getUnreadCount(userId); }
}
