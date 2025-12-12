import { PrismaService } from '@/common/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetFieldType, AssetTypeField } from '@sigauth/generics/json-types';
import { Asset, Container } from '@sigauth/generics/prisma-client';
import { PROTECTED } from '@sigauth/generics/protected';

@Injectable()
export class AssetService {
    constructor(private readonly prisma: PrismaService) {}

    async createOrUpdateAsset(
        assetId: number | undefined,
        name: string,
        assetTypeId: number | undefined,
        fields: Record<number, string | number>,
        intern: boolean,
    ): Promise<Asset> {
        if (!intern && assetTypeId == PROTECTED.AssetType.id)
            throw new BadRequestException('Cannot create asset of protected asset type (id: ' + PROTECTED.AssetType.id + ')');

        const finalAssetTypeId = assetTypeId ?? (await this.prisma.asset.findUnique({ where: { id: assetId ?? -1 } }))?.typeId;
        if (!finalAssetTypeId) throw new NotFoundException('Invalid asset type');

        const assetType = await this.prisma.assetType.findUnique({ where: { id: finalAssetTypeId } });
        if (!assetType) throw new NotFoundException('Invalid asset type');

        const assetTypeFields = assetType.fields as AssetTypeField[];
        if (!assetTypeFields.filter(f => f.required).every(af => Object.keys(fields).includes(af.id.toString())))
            throw new BadRequestException('Required fields are missing');

        if (Object.values(fields).some(v => v === undefined)) throw new BadRequestException('Some fields have undefined values');

        if (Object.keys(fields).every(k => !assetTypeFields.find(f => f.id.toString() == k)))
            throw new BadRequestException(
                'Unknown fields provided (' +
                    Object.keys(fields)
                        .filter(k => !assetTypeFields.find(f => f.id.toString() == k))
                        .join(', ') +
                    ')',
            );

        // check if every variable is of the right type
        for (const field of Object.entries(fields)) {
            const correspondingField = assetTypeFields.find(f => f.id == +field[0]);
            const targetType =
                correspondingField?.type === AssetFieldType.TEXT
                    ? 'string'
                    : correspondingField?.type === AssetFieldType.CHECKFIELD
                      ? 'boolean'
                      : 'number';
            if (typeof field[1] != targetType)
                throw new BadRequestException(
                    'Invalid field type ( field: ' + field[0].toString() + ' must be of type ' + targetType + ')',
                );
        }

        return this.prisma.asset.upsert({
            where: {
                id: assetId ?? -1,
            },
            create: {
                name,
                typeId: finalAssetTypeId,
                fields,
            },
            update: {
                name,
                fields,
            },
        });
    }

    async applyUsedContainers(assetId: number, containerIds: number[]): Promise<Container[]> {
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException('Asset not found');
        if (containerIds.includes(PROTECTED.Container.id)) throw new BadRequestException('Cannot modify protected container');

        if ((await this.prisma.container.count({ where: { id: { in: containerIds } } })) != containerIds.length)
            throw new NotFoundException('Container not found');

        const appliedContainers = await this.prisma.container.findMany({ where: { assets: { has: assetId } } });
        const added = containerIds.filter(id => !appliedContainers.find(c => c.id == id));
        const removed = appliedContainers.filter(c => !containerIds.includes(c.id));

        for (const container of removed) {
            await this.prisma.container.update({
                where: { id: container.id },
                data: { assets: { set: container.assets.filter(i => i != asset.id) } },
            });
        }

        for (const containerId of added) {
            await this.prisma.container.update({
                where: { id: containerId },
                data: {
                    assets: { push: asset.id },
                },
            });
        }

        return await this.prisma.container.findMany({ where: { assets: { has: assetId } } });
    }

    async deleteAssets(ids: number[]): Promise<Asset[]> {
        const assets = await this.prisma.asset.findMany({ where: { id: { in: ids } } });
        const containers = await this.prisma.container.findMany({ where: {} });
        if (assets.length == 0 || assets.length != ids.length) throw new NotFoundException('Not all asset found or invalid ids provided');

        for (const a of assets) {
            await this.prisma.permissionInstance.deleteMany({
                where: {
                    assetId: a.id,
                },
            });
        }

        for (const container of containers) {
            container.assets = container.assets.filter(n => !ids.includes(n));
            await this.prisma.container.update({
                where: { id: container.id },
                data: { assets: container.assets || [] },
            });
        }

        await this.prisma.asset.deleteMany({ where: { id: { in: ids } } });
        return assets;
    }
}
