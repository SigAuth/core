import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { AppsController } from '@/modules/app/app.controller';
import { AppsService } from '@/modules/app/app.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';

@Module({
    imports: [HttpModule],
    controllers: [AppsController],
    providers: [AppsService, AuthGuard, IsRoot, PrismaService],
})
export class AppsModule {}
