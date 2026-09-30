import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AddEmbeddingDto, CreatePersonDto } from './recognition.dto';
import { RecognitionService, type PersonSummary } from './recognition.service';

@Controller('persons')
export class PersonsController {
  constructor(private readonly recognition: RecognitionService) {}

  @Post()
  create(@Body() input: CreatePersonDto): PersonSummary {
    return this.recognition.createPerson(input.id, input.name);
  }

  @Post(':id/embeddings')
  addEmbedding(@Param('id') id: string, @Body() input: AddEmbeddingDto): PersonSummary {
    return this.recognition.addEmbedding(id, input.embedding);
  }

  @Get()
  list(): PersonSummary[] {
    return this.recognition.listPeople();
  }
}
