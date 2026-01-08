import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AssetService } from '@/modules/asset/asset.service';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { MirrorController } from '@/modules/mirror/mirror.controller';
import { MirrorCronService } from '@/modules/mirror/mirror.cron';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [MirrorController],
    providers: [MirrorService, AuthGuard, IsRoot, AssetService, AssetTypeService, MirrorCronService],
})
export class MirrorModule {}
