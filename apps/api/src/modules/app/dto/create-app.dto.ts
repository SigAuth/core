import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUrl, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class PermissionsDto {
    @IsOptional()
    @IsUUID('7')
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'The UUID of the asset type the permissions is applied to',
        required: false,
    })
    typeUuid?: string;

    @IsArray()
    @IsString({ each: true })
    @MinLength(4, { each: true })
    @MaxLength(64, { each: true })
    @Matches(/^[a-zA-Z_\-:.]+$/, {
        each: true,
        message: 'permissions may only contain a-z, A-Z, _, -, :, .',
    })
    @ApiProperty({
        example: ['read', 'write', 'delete'],
        type: 'array',
        description: 'List of permission identifiers',
    })
    permissions!: string[];
}

export class CreateAppDto {
    @IsString()
    @ApiProperty({ example: 'Starlink Monitoring', description: 'Name of the app', type: 'string' })
    name!: string;

    @IsUrl()
    @ApiProperty({ example: 'https://starlink.com', description: 'URL of the app', type: 'string' })
    url!: string;

    @IsOptional()
    @IsUrl()
    @ApiProperty({
        example: 'https://starlink.com/oidc/auth',
        description: 'OIDC Authorization Code URL of the app',
    })
    oidcAuthCodeUrl?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionsDto)
    @ApiProperty({
        type: PermissionsDto,
        example: [
            { permissions: ['read', 'write', 'delete'] },
            { typeUuid: '550e8400-e29b-41d4-a716-446655440000', permissions: ['view', 'edit'] },
        ],
    })
    permissions!: PermissionsDto[];

    @IsArray()
    @IsString({ each: true })
    @ApiProperty({
        example: ['profile', 'email', 'address', 'blogs:admin'],
        description: 'List of OAuth2/OIDC scopes requested by the app',
        type: 'array',
    })
    scopes!: string[];
}

