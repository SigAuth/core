import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, Matches, ValidateNested } from 'class-validator';

export class PermissionsDto {
    @IsArray()
    @IsString({ each: true })
    @Matches(/^[A-Za-z0-9 _-]*$/, { each: true }) // space allowed because this is the permission name (ident is generated when applying permission instance)
    @ApiProperty({ type: [String], example: '["chart-insights", "reports", "maintainer"]' })
    asset!: string[];

    @IsArray()
    @IsString({ each: true })
    @Matches(/^[A-Za-z0-9 _-]*$/, { each: true })
    @ApiProperty({ type: [String], example: '["brand-manager", "editor", "viewer"]' })
    container!: string[];

    @IsArray()
    @IsString({ each: true })
    @Matches(/^[A-Za-z0-9 _-]*$/, { each: true })
    @ApiProperty({ type: [String], example: '["app1-administrator", "app1-developer"]' })
    root!: string[];
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

    @ValidateNested()
    @Type(() => PermissionsDto)
    @ApiProperty({
        type: PermissionsDto,
        example: {
            asset: ['chart-insights', 'reports', 'maintainer'],
            container: ['brand-manager', 'editor', 'viewer'],
            root: ['app1-administrator', 'app1-developer'],
        },
    })
    permissions!: PermissionsDto;

    @IsBoolean()
    @ApiProperty({
        example: true,
        type: 'boolean',
        description: 'Enable web fetch (periodically fetch permissions from the app)',
    })
    webFetchEnabled!: boolean;
}
