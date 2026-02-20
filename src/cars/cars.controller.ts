import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CarsService } from './cars.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Cars')
@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Public()
  @Get('by-type/:vehicleType')
  @ApiOperation({ summary: 'Get all vehicles by type (grouped by make/model)' })
  getByType(@Param('vehicleType') vehicleType: string) {
    return this.carsService.getByType(vehicleType);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List cars with filters' })
  findAll(@Query() query: any) { return this.carsService.findAll(query); }

  @Public()
  @Get('years')
  @ApiOperation({ summary: 'Get all available years' })
  getYears(@Query('vehicleType') vehicleType?: string) { return this.carsService.getAllYears(vehicleType); }

  @Public()
  @Get('makes')
  @ApiOperation({ summary: 'Get all car makes' })
  getMakes(@Query('vehicleType') vehicleType?: string) { return this.carsService.getMakes(vehicleType); }

  @Public()
  @Get('models/:make')
  @ApiOperation({ summary: 'Get models for a make' })
  getModels(@Param('make') make: string, @Query('vehicleType') vehicleType?: string) { return this.carsService.getModels(make, vehicleType); }

  /* @Public()
  @Get('years/:make/:model')
  @ApiOperation({ summary: 'Get years for make/model' })
  getYears(@Param('make') make: string, @Param('model') model: string) {
    return this.carsService.getYears(make, model);
  } */

  @Public()
  @Get('trims/:make/:model/:year')
  @ApiOperation({ summary: 'Get trims for make/model/year' })
  getTrims(@Param('make') make: string, @Param('model') model: string, @Param('year') year: number, @Query('vehicleType') vehicleType?: string) {
    return this.carsService.getTrims(make, model, year, vehicleType);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get car by ID with compatible parts' })
  findOne(@Param('id') id: string) { return this.carsService.findOne(id); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create car entry (admin)' })
  create(@Body() dto: any) { return this.carsService.create(dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update car entry (admin)' })
  update(@Param('id') id: string, @Body() dto: any) { return this.carsService.update(id, dto); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate car entry (admin)' })
  remove(@Param('id') id: string) { return this.carsService.remove(id); }
}
