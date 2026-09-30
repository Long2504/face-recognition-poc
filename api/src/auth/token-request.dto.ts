import { IsIP, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  keyServer!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bucket!: string;

  @Matches(/^(?:[1-9]\d*)(?:s|m|h|d)$/)
  expiresIn!: string;

  @IsIP()
  serverIp!: string;
}
