import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GarageService } from './garage.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Garage')
@ApiBearerAuth()
@Controller('garage')
export class GarageController {
  constructor(private garageService: GarageService) {}

  @Get()
  @ApiOperation({ summary: 'Get my garage vehicles' })
  getMyVehicles(@CurrentUser('id') userId: string) {
    return this.garageService.getMyVehicles(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add vehicle to garage' })
  addVehicle(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.garageService.addVehicle(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update garage vehicle' })
  updateVehicle(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) {
    return this.garageService.updateVehicle(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove vehicle from garage' })
  removeVehicle(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.garageService.removeVehicle(userId, id);
  }

  @Get(':id/parts')
  @ApiOperation({ summary: 'Get compatible parts for a garage vehicle' })
  getCompatibleParts(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.garageService.getCompatibleParts(userId, id);
  }
}
