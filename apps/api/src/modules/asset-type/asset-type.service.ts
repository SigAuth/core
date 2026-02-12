import { ORMService } from '@/internal/database/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { CreateAssetTypeDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { EditAssetTypeDto } from '@/modules/asset-type/dto/edit-asset-type.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DefinitiveAssetType } from '@sigauth/sdk/architecture';
import { FundamentalAssetTypes } from '@sigauth/sdk/protected';
import { convertTypeTableToUuid } from '@sigauth/sdk/utils';

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
    async editAssetType(dto: EditAssetTypeDto): Promise<DefinitiveAssetType | null> {
        const target = await this.db.DBClient.getAssetType(dto.uuid);
        if (!target) throw new NotFoundException('Asset type not found');

        return this.db.DBClient.editAssetType(dto.uuid, dto.updatedName, dto.updatedFields);
    }

    async deleteAssetType(uuids: string[]) {
        if (!this.db.TableMapping) throw new Error('Storage service not initialized yet');
        const criticalTypes = Object.entries(this.db.TableMapping)
            .filter(f => FundamentalAssetTypes.includes(f[0] as any))
            .map(s => convertTypeTableToUuid(s[1]));

        for (const uuid of uuids) {
            if (criticalTypes.includes(uuid)) {
                throw new Error(`Cannot delete critical asset type with uuid ${uuid}`);
            }
            await this.db.DBClient.deleteAssetType(uuid);
        }
    }

    async getAssetType(uuid: string): Promise<DefinitiveAssetType | null> {
        return this.db.DBClient.getAssetType(uuid);
    }

    async getAllAssetTypes(): Promise<DefinitiveAssetType[]> {
        return this.db.DBClient.getAssetTypes();
    }
}

