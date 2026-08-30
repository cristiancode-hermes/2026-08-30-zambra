import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { OrdersService } from './orders.service';
import { OrdersController, ReviewsController, StaffController, StatsController } from './orders.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [OrdersController, StaffController, StatsController, ReviewsController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
