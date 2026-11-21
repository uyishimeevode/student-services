import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module.js';
import {
  MyRequestsController,
  RequestsController,
} from './requests.controller.js';
import { RequestsService } from './requests.service.js';

@Module({
  imports: [StudentsModule],
  controllers: [MyRequestsController, RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
