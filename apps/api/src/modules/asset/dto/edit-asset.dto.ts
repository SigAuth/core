import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

export class EditAssetDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number', description: 'Id of the asset to edit' })
    assetId!: number;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'Blog Post', type: 'string', minimum: 4, description: 'New name of the asset' })
    name!: string;

    @IsNumber({}, { each: true })
    @IsPositive({ each: true })
    @ApiProperty({ example: [1, 2], type: 'array', items: { type: 'number' } })
    containerIds!: number[];

    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => Object)
    @ApiProperty({ type: Object, example: { '1': 'value', '2': 5 }, description: 'Old and new fields of the asset' })
    fields!: Record<string, string | number>; // fieldId and value
}
