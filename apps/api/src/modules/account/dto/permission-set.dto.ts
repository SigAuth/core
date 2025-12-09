import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class PermissionSetDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number', description: 'The ID of the account to update permissions for' })
    accountId!: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionDto)
    @ApiProperty({
        example: [
            { appId: 1, identifier: 'read', containerId: 2, assetId: 3 },
            { appId: 1, identifier: 'admin' },
        ],
        type: 'array',
        description: 'All permissions set for the account',
        items: { type: 'object' },
    })
    permissions!: PermissionDto[];
}

export class PermissionDto {
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @ApiProperty({
        example: 2,
        type: 'number',
        description: 'The ID of the container the permission applies to',
        required: false,
    })
    containerId?: number;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    @ApiProperty({
        example: 3,
        type: 'number',
        description: 'The ID of the asset the permission applies to',
        required: false,
    })
    assetId?: number;

    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number', description: 'The ID of the app the permission applies to' })
    appId!: number;

    @ApiProperty({
        example: 'read',
        type: 'string',
        description: 'The identifier of the permission (has to be registered in the app)',
    })
    @IsString()
    identifier!: string;
}
