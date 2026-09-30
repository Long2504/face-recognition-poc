import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { TokenRequestDto } from './token-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('token')
  createToken(
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() input: TokenRequestDto,
    @Ip() requestIp: string,
  ): { accessToken: string; tokenType: 'Bearer'; expiresIn: number } {
    return this.auth.issueToken(apiKey, input, requestIp);
  }
}
