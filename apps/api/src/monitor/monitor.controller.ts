import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { MonitorFrequency } from '@ppm/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MonitorService } from './monitor.service';

class CreateMonitorDto {
  @IsString()
  query!: string;

  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency!: MonitorFrequency;
}

@ApiTags('monitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  @Post('create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMonitorDto) {
    return this.monitor.create(user.userId, dto.query, dto.frequency);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.monitor.list(user.userId);
  }
}
