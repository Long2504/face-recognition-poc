import { Body, Controller, Post } from '@nestjs/common';
import { SearchRecognitionDto } from './recognition.dto';
import { RecognitionService } from './recognition.service';
import type { RecognitionResult } from './recognition.types';

@Controller('recognition')
export class RecognitionController {
  constructor(private readonly recognition: RecognitionService) {}

  @Post('search')
  search(@Body() input: SearchRecognitionDto): RecognitionResult {
    return this.recognition.search(input.embedding, input.topK, input.minimumSimilarity, input.minimumMargin);
  }
}
