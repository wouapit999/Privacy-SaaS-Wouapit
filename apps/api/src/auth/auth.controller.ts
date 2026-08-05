import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto, LinkOAuthDto } from './dto/auth.dto';
import { OAuthService } from './oauth/oauth.service';
import { isOAuthProvider } from './oauth/oauth.providers';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OAuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /**
   * Public: which OAuth providers are actually configured. The UI uses this to
   * only show buttons that will work (declared BEFORE the :provider route so
   * "providers" isn't captured as a provider name).
   */
  @Get('oauth/providers')
  providers() {
    return {
      google: this.oauth.isConfigured('google'),
      microsoft: this.oauth.isConfigured('microsoft'),
    };
  }

  /** Begin OAuth login/sign-up: redirects the browser to the provider. */
  @Get('oauth/:provider')
  start(@Param('provider') provider: string, @Res() res: Response) {
    if (!isOAuthProvider(provider)) throw new NotFoundException('Unknown provider.');
    res.redirect(this.oauth.buildAuthUrl(provider));
  }

  /**
   * Authenticated: get a URL to connect (link) this provider to the current
   * account. The signed state carries the caller's id so the callback links it.
   * Pass `identityId` to also use the connection as ownership proof for an
   * EMAIL/NAME identity (marks it verified if the provider profile matches).
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('oauth/:provider/link')
  link(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LinkOAuthDto,
  ) {
    if (!isOAuthProvider(provider)) throw new NotFoundException('Unknown provider.');
    return { url: this.oauth.buildAuthUrl(provider, user.userId, dto.identityId) };
  }

  /** OAuth redirect target: exchanges the code and hands tokens to the web app. */
  @Get('oauth/:provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (!isOAuthProvider(provider)) throw new NotFoundException('Unknown provider.');
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    if (error) return res.redirect(`${webOrigin}/login?error=${encodeURIComponent(error)}`);
    if (!code || !state) throw new BadRequestException('Missing code/state.');

    try {
      const { tokens, redirectTo, identityVerified } = await this.oauth.handleCallback(
        provider,
        code,
        state,
      );
      // Tokens go in the URL fragment so they are not sent to servers or logged.
      const fragment = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ...(identityVerified !== undefined
          ? { identityVerified: String(identityVerified) }
          : {}),
      }).toString();
      return res.redirect(`${redirectTo}#${fragment}`);
    } catch (err) {
      return res.redirect(
        `${webOrigin}/login?error=${encodeURIComponent((err as Error).message)}`,
      );
    }
  }
}
