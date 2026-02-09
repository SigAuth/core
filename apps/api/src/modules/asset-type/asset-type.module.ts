import { AssetTypeController } from '@/modules/asset-type/asset-type.controller';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetTypeController],
    providers: [AssetTypeService, SDKGuard, IsRoot],
})
export class AssetTypeModule {}

