import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get('vin')
  @ApiOperation({ summary: 'Search parts by VIN number (17 chars)' })
  searchByVin(@Query('vin') vin: string) {
    return this.searchService.searchByVin(vin);
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Product search with pagination (returns { data, meta })' })
  searchProducts(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.searchService.searchProducts(query, pageNum, limitNum);
  }

  @Public()
  @Get('advanced')
  @ApiOperation({ summary: 'Advanced search with make/model/year/category filters' })
  advancedSearch(
    @Query('q') query?: string,
    @Query('make') make?: string,
    @Query('model') model?: string,
    @Query('year') year?: number,
    @Query('categoryId') categoryId?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {
    return this.searchService.advancedSearch({
      query, make, model, year, categoryId, vehicleType, minPrice, maxPrice,
    });
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search autocomplete suggestions' })
  getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query);
  }
}
