import { AccountService } from '@/modules/account/account.service';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { DeleteAccountDto } from '@/modules/account/dto/delete-account.dto';
import { EditAccountDto } from '@/modules/account/dto/edit-account.dto';
import { PermissionSetDto } from '@/modules/account/dto/permission-set.dto';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Account } from '@sigauth/generics/prisma-client';

/**
 * What is meant by "Change to proper permission"
 *
 * If an account is granted access the PROTECTED.Container-Admin permission he is supposed to be able to create/edit/delete other accounts that have the same or lower permission level.
 *
 * Atm we only have the IsRoot guard that checks for the SigAuthRootPermissions.ROOT permission.
 * In the future we need to implement proper permission guards that check for the required permissions based on the account's permissions.
 */

@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
    constructor(private readonly accountService: AccountService) {}

    @Post('create')
    @UseGuards(IsRoot) // TODO Change to proper permission
    @HttpCode(HttpStatus.CREATED)
    @ApiCreatedResponse({
        description: 'Created account successfully!',
        example: { account: { id: 1, name: 'admin', email: 'test@example.com', api: '<API_TOKEN>' } },
    })
    @ApiBadRequestResponse({ description: 'Name or Email already exists' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    async createAccount(@Body() createAccountDto: CreateAccountDto): Promise<{ account: Account }> {
        const account = await this.accountService.createAccount(createAccountDto);
        return { account };
    }

    @Post('edit')
    @UseGuards(IsRoot) // TODO Change to proper permission
    @ApiOkResponse({
        description: 'Edited account successfully!',
        example: { account: { id: 1, name: 'admin', email: 'test@example.com', api: '<API_TOKEN>' } },
    })
    @ApiBadRequestResponse({ description: 'Name or Email already exists' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    async editAccount(@Body() editAccountDto: EditAccountDto): Promise<{ account: Account }> {
        const account = await this.accountService.editAccount(editAccountDto);
        return { account };
    }

    @Post('delete')
    @UseGuards(IsRoot) // TODO Change to proper permission
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse({ description: 'Not all accounts found or invalid ids provided' })
    async deleteAccount(@Body() deleteAccountDto: DeleteAccountDto): Promise<void> {
        await this.accountService.deleteAccount(deleteAccountDto);
    }

    @Post('permissions/set')
    @UseGuards(IsRoot) // TODO Change to proper permissions
    @ApiOkResponse({ description: 'Updated permissions successfully!' })
    @ApiBadRequestResponse({ description: 'Invalid permissions data' })
    @ApiNotFoundResponse({ description: 'Account not found' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    async setPermissions(@Body() permissionUpdateDto: PermissionSetDto) {
        const perms = await this.accountService.setPermissions(permissionUpdateDto);
        return { permissions: perms };
    }

    @Post('logout-all')
    @UseGuards(IsRoot) // TODO Change to proper permissions
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: 'Signed out user successfully!' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    async logoutAll(@Body('accountId') accountId: string) {
        await this.accountService.logOutAll(+accountId);
    }
}
