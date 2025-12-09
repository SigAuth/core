import { PrismaService } from '@/common/prisma/prisma.service';
import { AssetTypesController } from '@/modules/asset-type/asset-type.controller';
import { AssetTypesService } from '@/modules/asset-type/asset-type.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetTypesController],
    providers: [AssetTypesService, PrismaService, AuthGuard, IsRoot],
})
export class AssetTypesModule {}
