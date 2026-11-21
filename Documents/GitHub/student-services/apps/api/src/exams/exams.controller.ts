import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import { ExamsService } from './exams.service.js';

@Controller('my')
@Can(AccessPolicy, 'registerCourses')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get('exam-documents')
  documents(@CurrentUser() actor: AuthUser) {
    return this.exams.myDocuments(actor);
  }

  @Get('provisional-transcript')
  transcript(@CurrentUser() actor: AuthUser) {
    return this.exams.provisionalTranscript(actor);
  }
}
