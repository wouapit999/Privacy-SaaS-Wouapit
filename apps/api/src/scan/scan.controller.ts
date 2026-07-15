import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ScanService } from './scan.service';

class StartScanDto {
  @IsString()
  identityId!: string;
}

@ApiTags('scan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scan')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Post('start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartScanDto) {
    return this.scan.start(user.userId, dto.identityId);
  }

  @Get('results')
  results(@CurrentUser() user: AuthenticatedUser, @Query('scanId') scanId: string) {
    return this.scan.results(user.userId, scanId);
  }
}
