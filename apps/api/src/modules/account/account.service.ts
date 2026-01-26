import { FindWhere } from '@/internal/database/orm-client/sigauth.client';
import { Account } from '@/internal/database/orm-client/types.client';
import { ORMService } from '@/internal/database/orm.client';
import { Utils } from '@/internal/utils';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { EditAccountDto } from '@/modules/account/dto/edit-account.dto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';

@Injectable()
export class AccountService {
    private logger: Logger = new Logger(AccountService.name);

    constructor(private readonly db: ORMService) {}

    async createAccount(createAccountDto: CreateAccountDto): Promise<Account> {
        const existing = await this.db.Account.findOne({
            where: {
                OR: [{ username: createAccountDto.username }, { email: createAccountDto.email }],
            },
        });

        if (existing) {
            throw new BadRequestException('Name or Email already exists');
        }

        const account: Account = await this.db.Account.createOne({
            data: {
                username: createAccountDto.username,
                email: createAccountDto.email,
                passwordHash: bcrypt.hashSync(createAccountDto.password, 10),
                deactivated: false,
                api: createAccountDto.apiAccess ? Utils.generateToken(32) : undefined,
            },
        });

        return account;
    }

    async editAccount(editAccountDto: EditAccountDto): Promise<Account> {
        // Check for unique values (Name/Email)

        // Todo include permission in account type
        let account = await this.db.Account.findOne({
            where: { uuid: editAccountDto.uuid },
        });

        if (!account) throw new NotFoundException('Account does not exist');
        if (editAccountDto.username || editAccountDto.email) {
            const orConditions: FindWhere<Account>[] = [];
            if (editAccountDto.username) orConditions.push({ username: editAccountDto.username });
            if (editAccountDto.email) orConditions.push({ email: editAccountDto.email });

            const existing = await this.db.Account.findOne({
                where: {
                    OR: orConditions,
                },
            });

            if (existing && existing.uuid !== editAccountDto.uuid) {
                throw new BadRequestException('Name or Email already exists');
            }
        }

        // Dynamically build update object
        const data: { username?: string; email?: string; passwordHash?: string; api?: string; deactivated?: boolean } = {};
        if (editAccountDto.username) data.username = editAccountDto.username;
        if (editAccountDto.email) data.email = editAccountDto.email;
        if (editAccountDto.password) data.passwordHash = bcrypt.hashSync(editAccountDto.password, 10);
        if (editAccountDto.deactivated !== undefined) data.deactivated = editAccountDto.deactivated;
        if (editAccountDto.apiAccess !== undefined) {
            data.api = editAccountDto.apiAccess ? Utils.generateToken(32) : undefined;
        }

        // when deativated is toggled to true log out all sessions
        if (editAccountDto.deactivated && !account.deactivated) {
            // await this.logOutAll(editAccountDto.id);
        }

        const updated = await this.db.Account.updateOne({
            where: { uuid: editAccountDto.uuid },
            data,
        });

        return updated;
    }

    // async deleteAccount(deleteAccountDto: DeleteAccountDto) {

    //     await this.db.Permission Instance.deleteMany({
    //         where: { accountId: { in: deleteAccountDto.accountIds } },
    //     });

    //     await this.prisma.account.deleteMany({
    //         where: { id: { in: deleteAccountDto.accountIds } },
    //     });
    // }

    // async setPermissions(permissionSetDto: PermissionSetDto) {
    //     const account = await this.prisma.account.findUnique({
    //         where: { id: permissionSetDto.accountId },
    //     });

    //     if (!account) throw new NotFoundException('Account not found');
    //     const maintained: PermissionInstance[] = [];

    //     for (const perm of permissionSetDto.permissions) {
    //         const app = await this.prisma.app.findUnique({
    //             where: { id: perm.appId },
    //         });
    //         if (!app) throw new NotFoundException(`App with ID ${perm.appId} not found`);

    //         async function checkAppContainerRelation(prisma: PrismaClient) {
    //             const container = await prisma.container.findFirst({ where: { id: perm.containerId } });
    //             if (!container) throw new NotFoundException(`Container with ID ${perm.containerId} not found`);
    //             if (!container.apps.includes(app!.id ?? -1))
    //                 throw new BadRequestException(`Container with ID ${perm.containerId} is not related to App ${app!.name}`);
    //         }

    //         this.logger.debug(`Checking permission ${perm.identifier} for app ${app.name} ${app.id} ${perm.appId}`);
    //         let found = false;
    //         const permissions = app.permissions as AppPermission;
    //         const ident = Utils.convertPermissionNameToIdent(perm.identifier);
    //         if (permissions.asset.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
    //             found = true;
    //             if (!perm.assetId || !perm.containerId) {
    //                 throw new BadRequestException(`Asset ID and Container ID must be provided for asset permissions`);
    //             }
    //             await checkAppContainerRelation(this.prisma);
    //         } else if (permissions.container.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
    //             found = true;
    //             if (!perm.containerId || perm.assetId) {
    //                 throw new BadRequestException(`Container ID without an asset ID must be provided for container permissions`);
    //             }
    //             await checkAppContainerRelation(this.prisma);
    //         } else if (permissions.root.map(p => Utils.convertPermissionNameToIdent(p)).includes(ident)) {
    //             found = true;
    //             if (perm.containerId || perm.assetId) {
    //                 throw new BadRequestException(`No Container ID or Asset ID must be provided for root permissions`);
    //             }
    //         }
    //         if (!found) throw new BadRequestException(`Permission ${perm.identifier} not found in app ${app.name}`);

    //         const queryObject = {
    //             accountId: permissionSetDto.accountId,
    //             appId: perm.appId,
    //             identifier: ident,
    //             containerId: perm.containerId ?? null,
    //             assetId: perm.assetId ?? null,
    //         };
    //         const existing = await this.prisma.permissionInstance.findFirst({
    //             where: queryObject,
    //         });

    //         if (!existing) {
    //             try {
    //                 const createdPerm = await this.prisma.permissionInstance.create({
    //                     data: queryObject,
    //                 });
    //                 maintained.push(createdPerm);
    //             } catch (_) {
    //                 throw new BadRequestException('Error creating permission: some foreign keys do not exist');
    //             }
    //         } else {
    //             maintained.push(existing);
    //         }
    //     }

    //     // remove all permissions that are not in the new set
    //     await this.prisma.permissionInstance.deleteMany({
    //         where: {
    //             id: { notIn: maintained.map(p => p.id) },
    //             accountId: permissionSetDto.accountId,
    //         },
    //     });

    //     return maintained;
    // }

    // async logOutAll(accountId: number) {
    //     await this.prisma.session.deleteMany({
    //         where: { subject: accountId },
    //     });
    // }
}
