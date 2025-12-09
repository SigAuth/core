import { ApiProperty } from '@nestjs/swagger';
import { AssetTypeField } from '@sigauth/generics/json-types';
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
    id!: number;

    @IsNumber()
    @Min(1)
    @Max(5)
    @ApiProperty({ example: 1, enum: [1, 2, 3, 4, 5] })
    type!: number;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'Height', type: 'string' })
    name!: string;

    @IsBoolean()
    @ApiProperty({ example: true, type: 'boolean' })
    required!: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    @ApiProperty({ example: ['Office', 'Family', 'Block', 'Hotel'], type: [String] })
    options?: string[];
}
