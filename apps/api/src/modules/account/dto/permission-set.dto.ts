import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class PermissionSetDto {
    @IsUUID('7')
    @ApiProperty({ example: 1, type: 'string', description: 'The UUID of the account to update permissions for' })
    accountUuid!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionDto)
    @ApiProperty({
        example: [
            { appUuid: 'uuid1', permission: 'read', assetUuid: 'uuid3', typeUuid: 'uuid2' },
            { appUuid: 'uuid1', permission: 'view' },
        ],
        type: 'array',
        description:
            'All permissions set for the account. Not providing a permission will remove it from the account. Empty assetUuid and typeUuid mean global permission for the app.',
        items: { type: 'object' },
    })
    permissions!: PermissionDto[];
}

export class PermissionDto {
    @IsOptional()
    @IsUUID('7')
    @ApiProperty({
        example: 2,
        type: 'string',
        description: 'The UUID of the asset type the permission applies to',
        required: false,
    })
    typeUuid?: string;

    @IsOptional()
    @IsUUID('7')
    @ApiProperty({
        example: 3,
        type: 'string',
        description: 'The UUID of the asset the permission applies to',
        required: false,
    })
    assetUuid?: string;

    @IsUUID('7')
    @ApiProperty({ example: 1, type: 'string', description: 'The UUID of the app the permission applies to' })
    appUuid!: string;

    @ApiProperty({
        example: 'read',
        type: 'string',
        description: 'Permission name and be applicable to specific asset / asset type (has to be registered in the app)',
    })
    @IsString()
    permission!: string;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ example: false, type: 'boolean', description: 'Whether the permission is grantable to other accounts' })
    grantable: boolean = false;
}

