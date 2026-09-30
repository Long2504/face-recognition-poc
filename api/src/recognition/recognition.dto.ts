import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RECOGNITION_CONFIG } from './recognition.config';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class AddEmbeddingDto {
  @IsArray()
  @ArrayMinSize(RECOGNITION_CONFIG.embeddingDimensions)
  @ArrayMaxSize(RECOGNITION_CONFIG.embeddingDimensions)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];
}

export class SearchRecognitionDto extends AddEmbeddingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECOGNITION_CONFIG.maximumTopK)
  topK: number = RECOGNITION_CONFIG.defaultTopK;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-1)
  @Max(1)
  minimumSimilarity: number = RECOGNITION_CONFIG.minimumSimilarity;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  minimumMargin: number = RECOGNITION_CONFIG.minimumMargin;
}
