import { PrismaService } from '@/common/prisma/prisma.service';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AssetService } from '@/modules/asset/asset.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { ContainerService } from '@/modules/container/container.service';
import { MirrorController } from '@/modules/mirror/mirror.controller';
import { MirrorCronService } from '@/modules/mirror/mirror.cron';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [MirrorController],
    providers: [MirrorService, PrismaService, AuthGuard, IsRoot, AssetService, ContainerService, AssetTypeService, MirrorCronService],
})
export class MirrorModule {}
