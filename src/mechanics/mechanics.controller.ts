import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MechanicsService } from './mechanics.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Mechanics')
@Controller('mechanics')
export class MechanicsController {
  constructor(private mechanicsService: MechanicsService) {}

  @Public() @Get() @ApiOperation({ summary: 'List mechanic shops' })
  findAll(@Query() query: any) { return this.mechanicsService.findAll(query); }

  @Public() @Get(':id') @ApiOperation({ summary: 'Get mechanic shop by ID' })
  findOne(@Param('id') id: string) { return this.mechanicsService.findOne(id); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Post() @ApiOperation({ summary: 'Create mechanic shop' })
  create(@Body() dto: any) { return this.mechanicsService.create(dto); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id') @ApiOperation({ summary: 'Update mechanic shop' })
  update(@Param('id') id: string, @Body() dto: any) { return this.mechanicsService.update(id, dto); }

  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete(':id') @ApiOperation({ summary: 'Deactivate mechanic shop' })
  remove(@Param('id') id: string) { return this.mechanicsService.remove(id); }
}
