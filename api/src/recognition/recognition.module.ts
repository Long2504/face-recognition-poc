import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';

@Module({
  controllers: [PersonsController, RecognitionController],
  providers: [RecognitionService],
})
export class RecognitionModule {}
