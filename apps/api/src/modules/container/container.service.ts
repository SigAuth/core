import { PrismaService } from '@/common/prisma/prisma.service';
import { AssetService } from '@/modules/asset/asset.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Asset, Container } from '@sigauth/prisma-wrapper/prisma-client';
import { PROTECTED } from '@sigauth/prisma-wrapper/protected';

@Injectable()
export class ContainerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly assetService: AssetService,
    ) {}

    async createContainer(name: string, assets: number[], apps: number[]): Promise<{ container: Container; containerAsset: Asset }> {
        if (apps.includes(PROTECTED.App.id)) throw new BadRequestException('Cannot add protected app to container');
        // check if assets and apps actually exist
        const assetCount = await this.prisma.asset.count({ where: { id: { in: assets.map(a => a) } } });
        if (assetCount != assets.length) throw new NotFoundException('Invalid assets');

        const appCount = await this.prisma.app.count({ where: { id: { in: apps.map(a => a) } } });
        if (appCount != apps.length) throw new NotFoundException('Invalid apps');

        const container = await this.prisma.container.create({
            data: {
                name,
                assets,
                apps,
            },
        });

        const containerAsset = await this.assetService.createOrUpdateAsset(
            undefined,
            container.id + ' ' + container.name,
            PROTECTED.AssetType.id,
            {
                0: container.id,
                1: container.name,
            },
            true,
        );
        const sigAuthContainer = await this.prisma.container.findFirst({ where: { id: PROTECTED.Container.id } });
        await this.prisma.container.update({
            where: { id: PROTECTED.Container.id },
            data: {
                assets: [...sigAuthContainer!.assets, containerAsset.id],
            },
        });

        return { container, containerAsset };
    }

    async editContainer(containerId: number, name: string, assets: number[], apps: number[]): Promise<Container> {
        if (apps.includes(PROTECTED.App.id)) throw new BadRequestException('Cannot add protected app to container');
        if (containerId == PROTECTED.Container.id) throw new BadRequestException('Cannot edit protected container');

        const container = await this.prisma.container.findUnique({ where: { id: containerId } });
        if (!container) throw new NotFoundException('Container not found');

        const assetCount = await this.prisma.asset.count({ where: { id: { in: assets.map(a => a) } } });
        if (assetCount != assets.length) throw new NotFoundException('Invalid assets');

        const appCount = await this.prisma.app.count({ where: { id: { in: apps.map(a => a) } } });
        if (appCount != apps.length) throw new NotFoundException('Invalid apps');

        const removedApps = container.apps.filter(a => !apps.includes(a));
        const removedAssets = container.assets.filter(a => !assets.includes(a));

        if (removedApps.length > 0) {
            await this.prisma.permissionInstance.deleteMany({
                where: {
                    containerId,
                    appId: { in: removedApps },
                },
            });
        }

        if (removedAssets.length > 0) {
            await this.prisma.permissionInstance.deleteMany({
                where: {
                    containerId,
                    assetId: { in: removedAssets },
                },
            });
        }

        await this.prisma.asset.updateMany({
            where: {
                typeId: PROTECTED.Container.id,
                fields: {
                    path: ['0'],
                    equals: container.id,
                },
            },
            data: {
                name: container.id + ' - ' + name,
                fields: {
                    0: container.id,
                    1: name,
                },
            },
        });

        return this.prisma.container.update({
            where: { id: containerId },
            data: {
                name,
                assets,
                apps,
            },
        });
    }

    async deleteContainers(containerIds: number[]) {
        if (containerIds.includes(PROTECTED.Container.id)) throw new BadRequestException('Cannot delete protected container');

        await this.prisma.permissionInstance.deleteMany({
            where: {
                containerId: { in: containerIds },
            },
        });
        await this.prisma.container.deleteMany({
            where: {
                id: { in: containerIds },
            },
        });

        const removedContainerAssets: number[] = [];
        for (const id of containerIds) {
            removedContainerAssets.push(
                ...(
                    await this.prisma.asset.findMany({
                        where: {
                            typeId: PROTECTED.Container.id,
                            fields: {
                                path: ['0'],
                                equals: id,
                            },
                        },
                        select: { id: true },
                    })
                ).map(a => a.id),
            );
            await this.prisma.asset.deleteMany({ where: { id: { in: removedContainerAssets } } });
        }
        const permContainer = await this.prisma.container.findFirst({ where: { id: PROTECTED.Container.id } });
        await this.prisma.container.update({
            where: { id: PROTECTED.Container.id },
            data: { assets: (permContainer?.assets as number[]).filter(a => !removedContainerAssets.includes(a)) },
        });
        await this.prisma.permissionInstance.deleteMany({
            where: {
                assetId: { in: removedContainerAssets },
            },
        });
    }
}
