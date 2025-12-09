import { PermissionsDto } from '@/modules/app/dto/create-app.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUrl, ValidateNested } from 'class-validator';

export class EditAppDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number', description: 'Id of the app to edit' })
    id!: number;

    @IsString()
    @ApiProperty({ example: 'Starlink Monitoring', description: 'Name of the app', type: 'string' })
    name!: string;

    @IsString()
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

    @IsBoolean()
    @ApiProperty({
        example: true,
        type: 'boolean',
        description: 'Enable nudge (send push notification to the app)',
    })
    nudge!: boolean;
}
