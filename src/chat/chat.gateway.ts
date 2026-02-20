import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, string[]>();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const existing = this.userSockets.get(userId) || [];
      existing.push(client.id);
      this.userSockets.set(userId, existing);
      client.data.userId = userId;
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const updated = sockets.filter((id) => id !== client.id);
      if (updated.length === 0) this.userSockets.delete(userId);
      else this.userSockets.set(userId, updated);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(data.roomId);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(data.roomId);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string; type?: string; fileUrl?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const message = await this.chatService.sendMessage(
      userId, data.roomId, data.content, data.type, data.fileUrl,
    );

    this.server.to(data.roomId).emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.to(data.roomId).emit('userTyping', {
      userId: client.data.userId,
      roomId: data.roomId,
    });
  }
}
