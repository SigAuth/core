import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';

export class EditAssetDto {
    @IsUUID('7')
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', type: 'string', description: 'UUID of the asset to edit' })
    uuid!: string;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'Blog Post', type: 'string', minimum: 4, description: 'New name of the asset' })
    name!: string;

    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => Object)
    @ApiProperty({ type: Object, example: { '1': 'value', '2': 5 }, description: 'Old and new fields of the asset' })
    fields!: Record<string, string | number | boolean | Date>; // fieldId and value
}

