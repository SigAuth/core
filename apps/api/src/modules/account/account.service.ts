import { PrismaService } from '@/common/prisma/prisma.service';
import { Utils } from '@/common/utils';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { DeleteAccountDto } from '@/modules/account/dto/delete-account.dto';
import { EditAccountDto } from '@/modules/account/dto/edit-account.dto';
import { PermissionSetDto } from '@/modules/account/dto/permission-set.dto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppPermission } from '@sigauth/generics/json-types';
import { AccountWithPermissions } from '@sigauth/generics/prisma-extended';
import { Account, PermissionInstance, Prisma, PrismaClient } from '@sigauth/generics/prisma-client';
import bcrypt from 'bcryptjs';

@Injectable()
export class AccountService {
    private logger: Logger = new Logger(AccountService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createAccount(createAccountDto: CreateAccountDto): Promise<AccountWithPermissions> {
        const existing = await this.prisma.account.findFirst({
            where: {
                OR: [{ name: createAccountDto.name }, { email: createAccountDto.email }],
            },
        });

        if (existing) {
            throw new BadRequestException('Name or Email already exists');
        }

        const account: Account = await this.prisma.account.create({
            data: {
                name: createAccountDto.name,
                email: createAccountDto.email,
                password: bcrypt.hashSync(createAccountDto.password, 10),
                api: createAccountDto.apiAccess ? Utils.generateToken(32) : null,
            },
        });

        return { ...account, permissions: [] };
    }

    async editAccount(editAccountDto: EditAccountDto): Promise<AccountWithPermissions> {
        // Check for unique values (Name/Email)
        if (editAccountDto.name || editAccountDto.email) {
            const orConditions: Prisma.AccountWhereInput[] = [];
            if (editAccountDto.name) orConditions.push({ name: editAccountDto.name });
            if (editAccountDto.email) orConditions.push({ email: editAccountDto.email });

            const existing = await this.prisma.account.findFirst({
                where: {
                    OR: orConditions,
                },
            });

            if (existing && existing.id !== editAccountDto.id) {
                throw new BadRequestException('Name or Email already exists');
            }
        }

        // Dynamically build update object
        const data: { name?: string; email?: string; password?: string; api?: string | null } = {};
        if (editAccountDto.name) data.name = editAccountDto.name;
        if (editAccountDto.email) data.email = editAccountDto.email;
        if (editAccountDto.password) data.password = bcrypt.hashSync(editAccountDto.password, 10);
        if (editAccountDto.apiAccess !== undefined) {
            data.api = editAccountDto.apiAccess ? Utils.generateToken(32) : null;
        }

        const account = await this.prisma.account.update({
            where: { id: editAccountDto.id },
            data,
        });

        return { ...account, permissions: [] };
    }

    async deleteAccount(deleteAccountDto: DeleteAccountDto) {
        await this.prisma.permissionInstance.deleteMany({
            where: { accountId: { in: deleteAccountDto.accountIds } },
        });

        await this.prisma.account.deleteMany({
            where: { id: { in: deleteAccountDto.accountIds } },
        });
    }

    async setPermissions(permissionSetDto: PermissionSetDto) {
        const account = await this.prisma.account.findUnique({
            where: { id: permissionSetDto.accountId },
        });

        if (!account) throw new NotFoundException('Account not found');
        const maintained: PermissionInstance[] = [];

        for (const perm of permissionSetDto.permissions) {
            const app = await this.prisma.app.findUnique({
                where: { id: perm.appId },
            });
            if (!app) throw new NotFoundException(`App with ID ${perm.appId} not found`);

            async function checkAppContainerRelation(prisma: PrismaClient) {
                const container = await prisma.container.findFirst({ where: { id: perm.containerId } });
                if (!container) throw new NotFoundException(`Container with ID ${perm.containerId} not found`);
                if (!container.apps.includes(app!.id ?? -1))
                    throw new BadRequestException(`Container with ID ${perm.containerId} is not related to App ${app!.name}`);
            }

            this.logger.debug(`Checking permission ${perm.identifier} for app ${app.name} ${app.id} ${perm.appId}`);
            let found = false;
            const permissions = app.permissions as AppPermission;
            const ident = Utils.convertPermissionNameToIdent(perm.identifier);
            if (permissions.asset.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
                found = true;
                if (!perm.assetId || !perm.containerId) {
                    throw new BadRequestException(`Asset ID and Container ID must be provided for asset permissions`);
                }
                await checkAppContainerRelation(this.prisma);
            } else if (permissions.container.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
                found = true;
                if (!perm.containerId || perm.assetId) {
                    throw new BadRequestException(`Container ID without an asset ID must be provided for container permissions`);
                }
                await checkAppContainerRelation(this.prisma);
            } else if (permissions.root.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
                found = true;
                if (perm.containerId || perm.assetId) {
                    throw new BadRequestException(`No Container ID or Asset ID must be provided for root permissions`);
                }
            }
            if (!found) throw new BadRequestException(`Permission ${perm.identifier} not found in app ${app.name}`);

            const queryObject = {
                accountId: permissionSetDto.accountId,
                appId: perm.appId,
                identifier: ident,
                containerId: perm.containerId ?? null,
                assetId: perm.assetId ?? null,
            };
            const existing = await this.prisma.permissionInstance.findFirst({
                where: queryObject,
            });

            if (!existing) {
                try {
                    const createdPerm = await this.prisma.permissionInstance.create({
                        data: queryObject,
                    });
                    maintained.push(createdPerm);
                } catch (_) {
                    throw new BadRequestException('Error creating permission: some foreign keys do not exist');
                }
            } else {
                maintained.push(existing);
            }
        }

        // remove all permissions that are not in the new set
        await this.prisma.permissionInstance.deleteMany({
            where: {
                id: { notIn: maintained.map(p => p.id) },
                accountId: permissionSetDto.accountId,
            },
        });

        return maintained;
    }
}
