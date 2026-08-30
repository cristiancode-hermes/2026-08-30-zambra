import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Addon, Seat, Show, ShowSeat, Zone } from '../entities/entities';
import { ShowsService } from './shows.service';
import { ShowsController } from './shows.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Show, ShowSeat, Zone, Addon, Seat])],
  controllers: [ShowsController],
  providers: [ShowsService],
  exports: [ShowsService],
})
export class ShowsModule {}
