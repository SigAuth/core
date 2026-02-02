import { AssetTypeController } from '@/modules/asset-type/asset-type.controller';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetTypeController],
    providers: [AssetTypeService, AuthGuard, IsRoot],
})
export class AssetTypeModule {}

