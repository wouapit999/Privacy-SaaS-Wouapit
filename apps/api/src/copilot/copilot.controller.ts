import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CopilotService } from './copilot.service';

class AskDto {
  @IsString()
  @MaxLength(1000)
  question!: string;
}

@ApiTags('copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('ask')
  ask(@CurrentUser() user: AuthenticatedUser, @Body() dto: AskDto) {
    return this.copilot.ask(user.userId, dto.question);
  }
}
