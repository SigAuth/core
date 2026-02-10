import type { FindQuery } from '@/internal/database/generic/orm-client/sigauth.client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @Type(() => FindQueryClass)
    query!: FindQuery<any>;
}

export class FindQueryClass {
    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsObject()
    where?: any;

    @IsOptional()
    @IsObject()
    includes?: any;

    @IsOptional()
    @Type(() => AuthorzationClass)
    authorization?: AuthorzationClass;

    @IsOptional()
    @IsObject()
    orderBy?: Record<string, 'asc' | 'desc'>;
}

export class AuthorzationClass {
    @IsUUID('7')
    account!: string;

    @IsArray()
    @IsString({ each: true })
    scopes!: string[];

    @IsBoolean()
    recusive!: boolean;
}

