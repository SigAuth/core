import { PrismaService } from '@/common/prisma/prisma.service';
import { AssetTypeController } from '@/modules/asset-type/asset-type.controller';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AssetService } from '@/modules/asset/asset.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetTypeController],
    providers: [AssetTypeService, PrismaService, AuthGuard, IsRoot, AssetService],
})
export class AssetTypeModule {}
