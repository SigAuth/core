import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateAssetTypeDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetFieldType, AssetTypeField } from '@sigauth/prisma-wrapper/json-types';
import { AssetType } from '@sigauth/prisma-wrapper/prisma-client';
import { PROTECTED } from '@sigauth/prisma-wrapper/protected';

@Injectable()
export class AssetTypesService {
    constructor(private readonly prisma: PrismaService) {}

    async createAssetType(createAssetTypeDto: CreateAssetTypeDto): Promise<AssetType> {
        const normalizedFields = createAssetTypeDto.fields.map((f, i) => {
            f.id = i;
            return f;
        });

        return this.prisma.assetType.create({
            data: {
                name: createAssetTypeDto.name,
                fields: normalizedFields,
            },
        });
    }

    /*
        This is a really heavy task and scales badly with the amount of asset being created
     */
    async editAssetType(targetId: number, updatedName: string, updatedFields: AssetTypeField[]): Promise<AssetType> {
        const target = await this.prisma.assetType.findFirst({ where: { id: targetId } });
        if (!target) throw new NotFoundException('Asset type not found');
        const currentFields = target.fields as unknown as AssetTypeField[];

        const currentFieldsCache = structuredClone(currentFields);
        const newFields: AssetTypeField[] = [];
        let highestFieldId = currentFields.reduce((acc, cur) => Math.max(acc, cur.id), 0);

        for (const newField of updatedFields) {
            if (newField.id == null) {
                newField.id = ++highestFieldId;
            } else {
                if (currentFieldsCache.find(f => f.id == newField.id)) {
                    currentFieldsCache.splice(
                        currentFieldsCache.findIndex(f => f.id == newField.id),
                        1,
                    ); // remove from currentField cache to prevent multiple fields being added with the same already existing id
                } else {
                    throw new ConflictException('Field with id ' + newField.id + ' could not be found (duplicate or invalid id)');
                }
            }

            newFields.push(newField);
        }

        const updatedAssetType = await this.prisma.assetType.update({
            where: { id: targetId },
            data: {
                name: updatedName,
                fields: newFields,
            },
        });

        // update asset according to field changes
        const addedFields = newFields.filter(f => !currentFields.find(cf => cf.id == f.id)); // that are only in the new field
        const removedFields = currentFields.filter(cf => !newFields.find(nf => nf.id == cf.id)); // that are only in the old fields
        const editedFields = newFields.filter(f =>
            currentFields.find(cf => cf.id == f.id && ((cf.required != f.required && f.required) || (cf.type != f.type && f.required))),
        ); // that are in both maps and are now required or type changed

        // TODO the so called default value down below is not applicable for all field types
        const assets = await this.prisma.asset.findMany({ where: { typeId: target.id } });
        for (const field of addedFields) {
            for (const asset of assets) {
                (asset.fields as Record<number, string | number>)[field.id] = field.type === AssetFieldType.NUMBER ? 0 : ''; // set new default value
            }
        }

        for (const field of removedFields) {
            for (const asset of assets) {
                delete (asset.fields as Record<number, string | number>)[field.id];
            }
        }

        for (const field of editedFields) {
            for (const asset of assets) {
                Object.entries(asset.fields as Record<number, string | number>).forEach(e => {
                    if (+e[0] == field.id && e[1] == undefined) {
                        e[1] = field.type === AssetFieldType.NUMBER ? 0 : ''; // set new default value
                    }
                });
            }
        }

        // write updated asset to database
        for (const a of assets) {
            await this.prisma.asset.update({
                where: { id: a.id },
                data: {
                    fields: a.fields as Record<number, string | number>,
                },
            });
        }

        return updatedAssetType;
    }

    async deleteAssetType(ids: number[]) {
        if (ids.includes(PROTECTED.AssetType.id)) throw new ConflictException('Cannot delete protected asset type');

        const assetTypes = await this.prisma.assetType.findMany({
            where: { id: { in: ids } },
        });
        if (assetTypes.length == 0 || assetTypes.length != ids.length)
            throw new NotFoundException('Not all asset types found or invalid ids provided');

        const containers = await this.prisma.container.findMany({ where: {} });
        for (const type of assetTypes) {
            const assets = await this.prisma.asset.findMany({ where: { typeId: type.id } });
            for (const container of containers) {
                container.assets = container.assets.filter(id => !assets.find(a => a.id === id));
            }

            await this.prisma.permissionInstance.deleteMany({
                where: {
                    assetId: { in: assets.map(a => a.id) },
                },
            });
            await this.prisma.asset.deleteMany({ where: { typeId: type.id } });
        }

        for (const c of containers) {
            await this.prisma.container.update({ where: { id: c.id }, data: { assets: c.assets || [] } });
        }
        await this.prisma.assetType.deleteMany({ where: { id: { in: ids } } });
    }
}
