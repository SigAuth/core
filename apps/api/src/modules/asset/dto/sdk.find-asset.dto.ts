import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class FindQueryClass {
    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsObject()
    where?: Record<string, any>;

    @IsOptional()
    @IsObject()
    includes?: any;

    @IsOptional()
    @Type(() => AuthorzationClass)
    authorization?: any;

    @IsOptional()
    @IsObject()
    orderBy?: Record<string, 'asc' | 'desc'>;

    @IsBoolean()
    internalAuthorization!: boolean;
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

export class FindAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @IsObject()
    @Type(() => FindQueryClass)
    @ValidateNested()
    query!: FindQueryClass;
}

