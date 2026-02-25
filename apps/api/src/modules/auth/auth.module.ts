import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CleanUpSessionCron } from './cron/cleanup.cron';

/**
 * Module handling authentication and authorization.
 */
@Module({
    controllers: [AuthController],
    providers: [AuthService, CleanUpSessionCron],
    exports: [AuthService],
})
export class AuthModule {}

