import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { MirrorController } from '@/modules/mirror/mirror.controller';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [MirrorController],
    providers: [MirrorService, PrismaService, AuthGuard, IsRoot],
})
export class MirrorModule {}
