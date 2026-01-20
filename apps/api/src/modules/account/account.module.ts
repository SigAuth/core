import { DatabaseModule } from '@/internal/database/database.module';
import { AccountController } from '@/modules/account/account.controller';
import { AccountService } from '@/modules/account/account.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Module } from '@nestjs/common';

@Module({
    imports: [DatabaseModule],
    controllers: [AccountController],
    providers: [AccountService, AuthGuard, IsRoot],
})
export class AccountModule {}
