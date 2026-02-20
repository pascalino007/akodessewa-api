import { IsOptional, IsString, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVerified?: boolean;
}

export class QueryUsersDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @IsString() street: string;
  @IsString() city: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @IsString() country: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
