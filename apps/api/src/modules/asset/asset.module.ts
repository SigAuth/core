import { AssetController } from '@/modules/asset/asset.controller';
import { AssetService } from '@/modules/asset/asset.service';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Module } from '@nestjs/common';

@Module({
    controllers: [AssetController],
    providers: [AssetService, SDKGuard, IsRoot],
})
export class AssetModule {}

