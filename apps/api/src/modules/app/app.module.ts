import { AppsController } from '@/modules/app/app.controller';
import { AppWebFetchCron } from '@/modules/app/app.cron';
import { AppsService } from '@/modules/app/app.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
    imports: [HttpModule],
    controllers: [AppsController],
    providers: [AppsService, AuthGuard, IsRoot, AppWebFetchCron],
})
export class AppsModule {}
