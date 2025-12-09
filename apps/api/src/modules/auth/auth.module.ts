import { PrismaService } from '@/common/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Module handling authentication and authorization.
 */
@Module({
    controllers: [AuthController],
    providers: [AuthService, PrismaService],
    exports: [AuthService],
})
export class AuthModule {}
