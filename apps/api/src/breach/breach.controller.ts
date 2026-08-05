import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BreachService } from './breach.service';

class EmailBreachDto {
  @IsString()
  identityId!: string;
}

@ApiTags('breach')
@Controller('breach')
export class BreachController {
  constructor(private readonly breach: BreachService) {}

  /** Whether the (key-gated) email breach check is available. */
  @Get('status')
  status() {
    return this.breach.status();
  }

  /** Check a user's OWN email identity against Have I Been Pwned. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('email')
  email(@CurrentUser() user: AuthenticatedUser, @Body() dto: EmailBreachDto) {
    return this.breach.emailBreaches(user.userId, dto.identityId);
  }
}
