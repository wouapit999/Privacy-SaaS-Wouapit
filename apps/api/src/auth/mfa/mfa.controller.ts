import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

import { JwtAuthGuard } from '../jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { MfaService } from './mfa.service';

class TokenDto {
  @IsString()
  @Length(6, 6)
  token!: string;
}

class MfaLoginDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 6)
  token!: string;
}

@ApiTags('mfa')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  enroll(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.enroll(user.userId, user.email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: TokenDto) {
    return this.mfa.confirm(user.userId, dto.token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable')
  disable(@CurrentUser() user: AuthenticatedUser, @Body() dto: TokenDto) {
    return this.mfa.disable(user.userId, dto.token);
  }

  /** Public: complete the second factor after a password login returned a challenge. */
  @Post('login')
  login(@Body() dto: MfaLoginDto) {
    return this.mfa.loginSecondFactor(dto.mfaToken, dto.token);
  }
}
