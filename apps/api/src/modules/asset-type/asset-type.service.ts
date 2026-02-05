import { ORMService } from '@/internal/database/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { CreateAssetTypeDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { EditAssetTypeDto } from '@/modules/asset-type/dto/edit-asset-type.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetType } from '../../../../../packages/sdk/dist/asset.types';

@Injectable()
export class AssetTypeService {
    constructor(
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    async createAssetType(dto: CreateAssetTypeDto) {
        return await this.db.DBClient.createAssetType(dto.name, dto.fields);
    }

    /*
        This is a really heavy task and scales badly with the amount of asset being created
     */
    async editAssetType(dto: EditAssetTypeDto): Promise<AssetType | null> {
        const target = await this.db.DBClient.getAssetType(dto.uuid);
        if (!target) throw new NotFoundException('Asset type not found');

        return this.db.DBClient.editAssetType(dto.uuid, dto.updatedName, dto.updatedFields);
    }

    async deleteAssetType(uuids: string[]) {
        if (!this.storage.InstancedSignature) throw new Error('Storage service not initialized yet');
        const criticalTypes = Object.values(this.storage.InstancedSignature).map(s => Utils.convertPermissionNameToIdent(s));

        for (const uuid of uuids) {
            if (criticalTypes.includes(uuid)) {
                throw new Error(`Cannot delete critical asset type with uuid ${uuid}`);
            }
            await this.db.DBClient.deleteAssetType(uuid);
        }
    }

    async getAssetType(uuid: string): Promise<AssetType | null> {
        return this.db.DBClient.getAssetType(uuid);
    }
}

