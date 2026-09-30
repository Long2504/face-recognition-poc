import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  const values: Record<string, string | number> = { API_KEY: 'test-api-key', JWT_MAX_EXPIRES_SECONDS: 3600 };
  const config = { getOrThrow: (key: string) => values[key], get: (key: string) => values[key] } as ConfigService;
  const jwt = { sign: jest.fn(() => 'signed-token') } as unknown as JwtService;
  const service = new AuthService(config, jwt);
  const input = { keyServer: 'web', bucket: 'poc', expiresIn: '30m', serverIp: '127.0.0.1' };

  it('rejects an invalid API key', () => {
    expect(() => service.issueToken('wrong-key-x', input, '127.0.0.1')).toThrow(UnauthorizedException);
  });

  it('creates a bounded token with request metadata', () => {
    expect(service.issueToken('test-api-key', input, '127.0.0.1')).toEqual({ accessToken: 'signed-token', tokenType: 'Bearer', expiresIn: 1800 });
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ keyServer: 'web', bucket: 'poc' }), { expiresIn: 1800 });
  });

  it('rejects expiration beyond the configured maximum', () => {
    expect(() => service.issueToken('test-api-key', { ...input, expiresIn: '2h' }, '127.0.0.1')).toThrow(UnauthorizedException);
  });
});
