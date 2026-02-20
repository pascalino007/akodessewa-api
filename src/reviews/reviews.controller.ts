import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews' })
  getProductReviews(@Param('productId') productId: string, @Query() query: any) {
    return this.reviewsService.getProductReviews(productId, query);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create review' })
  create(@CurrentUser('id') userId: string, @Body() dto: { productId: string; rating: number; title?: string; comment?: string }) {
    return this.reviewsService.create(userId, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update review' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: any) {
    return this.reviewsService.update(userId, id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete review' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string, @CurrentUser('role') role: string) {
    return this.reviewsService.remove(userId, id, role);
  }
}
