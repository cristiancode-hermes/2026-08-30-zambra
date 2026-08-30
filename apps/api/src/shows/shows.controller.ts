import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShowsService } from './shows.service';

@ApiTags('shows')
@Controller()
export class ShowsController {
  constructor(private readonly shows: ShowsService) {}

  @Get('shows')
  list() {
    return this.shows.list();
  }

  @Get('shows/:id')
  detail(@Param('id') id: string) {
    return this.shows.detail(id);
  }

  @Get('zones')
  zones() {
    return this.shows.zonesAll();
  }

  @Get('addons')
  addons() {
    return this.shows.addonsAll();
  }
}
