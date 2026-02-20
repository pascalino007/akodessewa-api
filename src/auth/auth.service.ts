import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  SupplierRegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import slugify from 'slugify';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || 'CUSTOMER',
        language: dto.language || 'fr',
        currency: dto.currency || 'XOF',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return { user, ...tokens };
  }

  async registerSupplier(dto: SupplierRegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const shopSlug = slugify(dto.shopName, { lower: true, strict: true }) + '-' + uuid().slice(0, 6);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'SUPPLIER',
        language: dto.language || 'fr',
        currency: dto.currency || 'XOF',
        shop: {
          create: {
            name: dto.shopName,
            slug: shopSlug,
            description: dto.shopDescription,
            country: dto.country,
            city: dto.city,
            street: dto.address,
            lat: dto.lat,
            lng: dto.lng,
          },
        },
        wallet: {
          create: {
            currency: dto.currency || 'XOF',
          },
        },
        subscription: {
          create: {
            plan: 'BASIC',
            status: 'ACTIVE',
            amount: 0,
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        shop: { select: { id: true, name: true, slug: true, lat: true, lng: true } },
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return { user, ...tokens };
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );

    return tokens;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuid();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.refreshToken.create({
      data: {
        token: `reset_${resetToken}`,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Send email with reset link using SMTP config
    // const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: `reset_${dto.token}` },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: stored.userId },
      data: { password: hashedPassword },
    });

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        language: true,
        currency: true,
        isVerified: true,
        createdAt: true,
        shop: {
          select: { id: true, name: true, slug: true, isVerified: true },
        },
        subscription: {
          select: { plan: true, status: true, endDate: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuid();
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = parseInt(refreshExpiresIn) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
