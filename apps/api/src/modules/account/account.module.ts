import { Module } from '@nestjs/common';
import { AccountService } from '@/modules/account/account.service';
import { AccountController } from '@/modules/account/account.controller';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';

@Module({
    controllers: [AccountController],
    providers: [AccountService, PrismaService, AuthGuard, IsRoot],
})
export class AccountModule {}
