import { PrismaService } from '@/common/prisma/prisma.service';
import { AssetController } from '@/modules/asset/asset.controller';
import { AssetService } from '@/modules/asset/asset.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetController],
    providers: [AssetService, PrismaService, AuthGuard, IsRoot],
})
export class AssetModule {}
