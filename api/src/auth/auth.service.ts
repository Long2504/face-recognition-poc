import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'node:crypto';
import { TokenRequestDto } from './token-request.dto';

const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  issueToken(apiKey: string | undefined, input: TokenRequestDto, requestIp: string): { accessToken: string; tokenType: 'Bearer'; expiresIn: number } {
    const expected = this.config.getOrThrow<string>('API_KEY');
    const supplied = apiKey ?? '';
    const matches = supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (!matches) throw new UnauthorizedException('Invalid API key');

    const expiresIn = this.parseExpiresIn(input.expiresIn);
    const accessToken = this.jwt.sign({
      keyServer: input.keyServer,
      bucket: input.bucket,
      serverIp: input.serverIp,
      requestIp,
    }, { expiresIn });

    return { accessToken, tokenType: 'Bearer', expiresIn };
  }

  private parseExpiresIn(value: string): number {
    const amount = Number(value.slice(0, -1));
    const unit = value.slice(-1);
    const seconds = amount * UNIT_SECONDS[unit];
    const maximum = this.config.get<number>('JWT_MAX_EXPIRES_SECONDS') ?? 86400;
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > maximum) {
      throw new UnauthorizedException(`expiresIn must not exceed ${maximum} seconds`);
    }
    return seconds;
  }
}
