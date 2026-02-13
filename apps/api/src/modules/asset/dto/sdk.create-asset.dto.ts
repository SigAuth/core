import type { CreateInput, CreateManyInput } from '@/internal/database/generic/sigauth.client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

// TODO - improve the validaors because they currently allow any objects for example during creation a custom uuid is not allowed and could be filtered here

export class SDKCreateOneAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @Type(() => CreateOneQueryClass)
    query!: CreateInput<any>;
}

export class SDKCreateManyAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @Type(() => CreateManyQueryClass)
    query!: CreateManyInput<object>;
}

export class CreateOneQueryClass {
    @IsObject()
    data!: any;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    select?: string[];
}

export class CreateManyQueryClass {
    @IsArray()
    @IsObject({ each: true })
    data!: any[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    select?: string[];
}
