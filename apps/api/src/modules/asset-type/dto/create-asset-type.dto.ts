import { ApiProperty } from '@nestjs/swagger';
import { AssetFieldType, AssetTypeField, AssetTypeRelationField, RelationalIntegrityStrategy } from '@sigauth/sdk/asset';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

export class CreateAssetTypeDto {
    @ApiProperty({ example: 'Blog Post', type: 'string' })
    @IsString()
    @MinLength(4)
    name!: string;

    @ApiProperty({
        example: [
            {
                type: 2,
                name: 'Height',
                required: false,
            },
            {
                type: 1,
                name: 'Address',
                required: true,
            },
            {
                type: 4,
                name: 'Owner',
                referentialIntegrityStrategy: 'CASCADE',
                targetAssetType: '550e8400-e29b-41d4-a716-446655440000',
                required: true,
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssetTypeFieldDto)
    fields!: (AssetTypeField | AssetTypeRelationField)[];
}

export class AssetTypeFieldDto {
    @IsNumber()
    @Min(1)
    @Max(7)
    @ApiProperty({ description: 'The datastructure used for the type', example: 1, enum: AssetFieldType })
    type!: AssetFieldType;

    @IsString()
    @MinLength(4)
    @MaxLength(64)
    @Matches(/^[a-zA-Z_][a-zA-Z0-9_]{3,63}$/)
    @ApiProperty({ description: 'The name of the field', example: 'Height', type: 'string' })
    name!: string;

    @IsBoolean()
    @ApiProperty({ description: 'Indicates if the field is required', example: true, type: 'boolean' })
    required!: boolean;

    @IsString()
    @IsOptional()
    @ApiProperty({
        example: 'CASCADE',
        enum: RelationalIntegrityStrategy,
        required: false,
        description: 'Define the behaviour when a related asset is deleted (only relevant for relation fields)',
    })
    referentialIntegrityStrategy?: RelationalIntegrityStrategy;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        example: true,
        type: 'boolean',
        description: 'Whether multiple assets can be related through that field (only relevant for relation fields)',
        required: false,
    })
    allowMultiple?: boolean;

    @IsOptional()
    @IsUUID('7')
    @ApiProperty({
        example: 2,
        type: 'number',
        required: false,
        description: 'The asset type this relation is referring to (only relevant for relation fields)',
    })
    targetAssetType?: string;
}
