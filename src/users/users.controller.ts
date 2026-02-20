import { Controller, Get, Patch, Delete, Param, Body, Query, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto, AdminUpdateUserDto, QueryUsersDto, CreateAddressDto, UpdateAddressDto } from './dto/users.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Get current user addresses' })
  getMyAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a new address' })
  createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Delete an address' })
  deleteAddress(@CurrentUser('id') userId: string, @Param('addressId') addressId: string) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin update user' })
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (admin)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
