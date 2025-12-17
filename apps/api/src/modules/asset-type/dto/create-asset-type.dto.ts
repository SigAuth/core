import { ApiProperty } from '@nestjs/swagger';
import { AssetTypeField } from '@sigauth/generics/prisma-client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

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
                name: 'Type',
                options: ['Office', 'Family', 'Block', 'Hotel'],
                required: true,
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssetTypeFieldDto)
    fields!: AssetTypeField[];
}

export class AssetTypeFieldDto {
    @IsOptional()
    @IsNumber()
    @ApiProperty({ example: 1, type: 'number' })
    fieldId!: number;

    @IsNumber()
    @Min(1)
    @Max(7)
    @ApiProperty({ example: 1, enum: [1, 2, 3, 4, 5, 6, 7] })
    fieldTypeId!: number;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'Height', type: 'string' })
    name!: string;

    @IsBoolean()
    @ApiProperty({ example: true, type: 'boolean' })
    required!: boolean;

    @IsOptional()
    @IsString({ each: true })
    @ApiProperty({ example: ['Option 1', 'Option 2', 'Option 3'], type: [String] })
    items?: string[];

    @IsString()
    @IsOptional()
    @ApiProperty({ example: 'CASCADE', enum: ['CASCADE', 'SET-NULL', 'RESTRICT', 'INVALIDATE'] })
    referentialIntegrityStrategy?: 'CASCADE' | 'SET-NULL' | 'RESTRICT' | 'INVALIDATE';

    @IsBoolean()
    @IsOptional()
    @ApiProperty({ example: true, type: 'boolean' })
    allowMultiple?: boolean;

    @IsOptional()
    @IsNumber({}, { each: true })
    @ApiProperty({ example: 2, type: 'number', description: 'The asset type IDs this relation can refer to' })
    referencedAssetTypes?: number[];
}
