import { FindWhere } from '@/internal/database/generic/orm-client/sigauth.client';
import { ORMService } from '@/internal/database/orm.client';
import { Utils } from '@/internal/utils';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { DeleteAccountDto } from '@/modules/account/dto/delete-account.dto';
import { EditAccountDto } from '@/modules/account/dto/edit-account.dto';
import { PermissionSetDto } from '@/modules/account/dto/permission-set.dto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SELF_REFERENCE_ASSET_TYPE_UUID } from '@sigauth/sdk/architecture';
import { Account } from '@sigauth/sdk/fundamentals';
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
            await this.logOutAll(editAccountDto.uuid);
        }

        const updated = await this.db.Account.updateOne({
            where: { uuid: editAccountDto.uuid },
            data,
        });

        return updated;
    }

    async deleteAccount(deleteAccountDto: DeleteAccountDto) {
        await this.db.Account.deleteMany({
            where: { uuid: { in: deleteAccountDto.accountUuids } },
        });
    }

    // TODO TEST adding, removing, maintaining
    async setPermissions(permissionSetDto: PermissionSetDto) {
        const account = await this.db.Account.findOne({
            where: { uuid: permissionSetDto.accountUuid },
        });

        if (!account) throw new NotFoundException('Account not found');
        const remove = await this.db.Grant.findMany({ where: { accountUuid: permissionSetDto.accountUuid } });

        for (const perm of permissionSetDto.permissions) {
            const exisiting = await this.db.Grant.findOne({
                where: {
                    accountUuid: permissionSetDto.accountUuid,
                    ...perm,
                },
            });

            if (!exisiting) {
                const app = await this.db.App.findOne({ where: { uuid: perm.appUuid } });
                if (!app) throw new NotFoundException(`App with UUID ${perm.appUuid} not found`);

                const permission = await this.db.Permission.findOne({
                    where: {
                        appUuid: app.uuid,
                        typeUuid: perm.typeUuid ? perm.typeUuid : undefined,
                        permission: perm.permission,
                    },
                });
                if (!permission) throw new BadRequestException(`Permission ${perm.permission} not found in app ${app.name}`);

                // check wether assetId is a valid asset or none for global permission
                if (perm.typeUuid) {
                    if (perm.typeUuid == SELF_REFERENCE_ASSET_TYPE_UUID) {
                        const targetAsset = await this.db.AssetType.findOne({
                            where: { uuid: perm.assetUuid },
                        });
                        if (!targetAsset) throw new NotFoundException(`Asset Type with UUID ${perm.assetUuid} not found`);
                    } else {
                        const targetType = await this.db.AssetType.findOne({
                            where: { uuid: perm.typeUuid },
                        });
                        if (!targetType) throw new NotFoundException(`Asset Type with UUID ${perm.typeUuid} not found`);
                        if (!perm.assetUuid) throw new BadRequestException(`Asset UUID must be provided for asset specific permissions`);

                        const asset = await this.db.DBClient.getAssetByUuid(perm.typeUuid, perm.assetUuid);
                        if (!asset) throw new NotFoundException(`Asset with UUID ${perm.assetUuid} not found`);
                    }
                }

                await this.db.Grant.createOne({
                    data: {
                        accountUuid: permissionSetDto.accountUuid,
                        ...perm,
                    },
                });
            } else {
                remove.splice(
                    remove.findIndex(
                        r =>
                            r.accountUuid === exisiting.accountUuid &&
                            r.appUuid === exisiting.appUuid &&
                            r.typeUuid === exisiting.typeUuid &&
                            r.assetUuid === exisiting.assetUuid &&
                            r.permission === exisiting.permission,
                    ),
                    1,
                );
            }
        }

        // remove all grants that were not part of the new set
        if (remove.length > 0) {
            const deleted = await this.db.Grant.deleteMany({
                where: {
                    OR: remove,
                },
            });
        }
    }

    getAccount(accountUuid: string, includePermissions = false): Promise<Account | null> {
        return this.db.Account.findOne({
            where: { uuid: accountUuid },
            includes: { account_grants: includePermissions },
        });
    }

    async logOutAll(accountUuid: string) {
        await this.db.Session.deleteMany({
            where: { subjectUuid: accountUuid },
        });
    }
}

