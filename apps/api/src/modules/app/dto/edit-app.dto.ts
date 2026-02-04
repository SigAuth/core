import { PermissionsDto } from '@/modules/app/dto/create-app.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, IsUUID, ValidateNested } from 'class-validator';

export class EditAppDto {
    @IsUUID('7')
    @ApiProperty({ example: 1, type: 'number', description: 'UUID of the app to edit' })
    uuid!: string;

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

    @IsBoolean()
    @ApiProperty({
        example: true,
        type: 'boolean',
        description: 'Enable nudge (send push notification to the app)',
    })
    nudge!: boolean;

    @IsArray()
    @IsString({ each: true })
    @ApiProperty({
        example: ['profile', 'email', 'address', 'blogs:admin'],
        description: 'List of OAuth2/OIDC scopes requested by the app',
        type: 'array',
    })
    scopes!: string[];
}

