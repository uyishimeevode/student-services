import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { JwtAuth } from './jwt-auth.provider.js';

@Module({
  controllers: [AuthController],
  providers: [JwtAuth, CredentialsService],
  exports: [CredentialsService],
})
export class AuthModule {}
