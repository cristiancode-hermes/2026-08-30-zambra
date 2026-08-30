import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto, ReviewDto, ScanDto } from './orders.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.mine(user.userId);
  }

  @Get('public/:code')
  publicByCode(@Param('code') code: string) {
    return this.orders.publicByCode(code);
  }

  @Get(':code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  byCode(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.orders.byCodeForUser(user.userId, code);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.cancel(user.userId, id);
  }
}

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly orders: OrdersService) {}

  @Post('scan')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  scan(@CurrentUser() user: AuthUser, @Body() dto: ScanDto) {
    return this.orders.scan(user.userId, dto.codeOrUrl);
  }
}

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('occupancy')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  occupancy() {
    return this.orders.occupancy();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.orders.points(user.userId);
  }
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.orders.addReview(user.userId, dto.showId, dto.rating, dto.body);
  }

  @Get('show/:showId')
  forShow(@Param('showId') showId: string) {
    return this.orders.reviewsForShow(showId);
  }
}
