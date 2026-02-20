import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SlidesService } from './slides.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Slides')
@Controller('slides')
export class SlidesController {
  constructor(private slidesService: SlidesService) {}

  @Public() @Get('active') @ApiOperation({ summary: 'Get active slides for website' })
  getActive(@Query('position') position?: string) { return this.slidesService.getActive(position); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Get() @ApiOperation({ summary: 'List all slides (admin)' })
  findAll(@Query() query: any) { return this.slidesService.findAll(query); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Get(':id') @ApiOperation({ summary: 'Get slide by ID' })
  findOne(@Param('id') id: string) { return this.slidesService.findOne(id); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Post() @ApiOperation({ summary: 'Create slide' })
  create(@Body() dto: any) { return this.slidesService.create(dto); }

  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MANAGER) @Patch(':id') @ApiOperation({ summary: 'Update slide' })
  update(@Param('id') id: string, @Body() dto: any) { return this.slidesService.update(id, dto); }

  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete(':id') @ApiOperation({ summary: 'Delete slide' })
  remove(@Param('id') id: string) { return this.slidesService.remove(id); }
}
