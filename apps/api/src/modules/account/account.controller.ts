import { AccountService } from '@/modules/account/account.service';
import { CreateAccountDto } from '@/modules/account/dto/create-account.dto';
import { DeleteAccountDto } from '@/modules/account/dto/delete-account.dto';
import { EditAccountDto } from '@/modules/account/dto/edit-account.dto';
import { PermissionSetDto } from '@/modules/account/dto/permission-set.dto';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Account } from '@sigauth/generics/prisma-client';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';

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

    @Post('deactivate')
    @UseGuards(IsRoot) // TODO Change to proper permission
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse({ description: 'Not all accounts found or invalid ids provided' })
    async deactivateAccount(@Body() deactivateAccount: DeactivateAccountDto): Promise<void> {
        deactivateAccount.accountIds.forEach(async accountId => {
            await this.accountService.logOutAll(accountId.toString());
        });
        await this.accountService.deactivateAccount(deactivateAccount);
    }

    @Post('activate')
    @UseGuards(IsRoot) // TODO Change to proper permission
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse({ description: 'Not all accounts found or invalid ids provided' })
    async activeAccount(@Body() activateAccount: ActivateAccountDto): Promise<void> {
        await this.accountService.activateAccount(activateAccount);
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
    async logoutAll(@Body('accountId') accountId: String) {
        await this.accountService.logOutAll(accountId);
    }
}
