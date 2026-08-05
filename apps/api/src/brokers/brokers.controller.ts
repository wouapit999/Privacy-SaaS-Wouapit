import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BrokersService } from './brokers.service';

@ApiTags('brokers')
@Controller('brokers')
export class BrokersController {
  constructor(private readonly brokers: BrokersService) {}

  /** Public catalog — no PII involved, so no auth required. */
  @Get()
  list() {
    return this.brokers.list();
  }

  /** Generate a CCPA/GDPR opt-out request for the caller for one broker. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/opt-out')
  optOut(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.brokers.generateOptOut(user.userId, id);
  }
}
