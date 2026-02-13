import type { DeleteInput } from '@/internal/database/generic/orm-client/sigauth.client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsUUID } from 'class-validator';

// TODO - improve the validaors because they currently allow any objects for example during creation a custom uuid is not allowed and could be filtered here

export class SDKDeleteOneAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @Type(() => DeleteQueryClass)
    query!: DeleteInput<any>;
}

export class SDKDeleteManyAssetDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    type!: string;

    @ApiProperty({
        description: 'The query used to find the assets',
        example: { filters: [{ field: 'name', operator: 'eq', value: 'Example' }] },
        type: Object,
    })
    @Type(() => DeleteQueryClass)
    query!: DeleteInput<any>;
}

export class DeleteQueryClass {
    @IsObject()
    where!: any;
}

