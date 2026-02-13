import { AccountController } from '@/modules/account/account.controller';
import { AccountService } from '@/modules/account/account.service';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AccountController],
    providers: [AccountService, SDKGuard, IsRoot],
})
export class AccountModule {}

