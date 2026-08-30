import { Controller, Module, Post, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('seed')
@Controller('seed')
class SeedController {
  constructor(private readonly seed: SeedService) {}

  @Post('reset')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  reset() {
    return this.seed.reset();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  providers: [SeedService],
  controllers: [SeedController],
  exports: [SeedService],
})
export class SeedModule {}
