import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';

export class CreateAssetDto {
    @IsUUID('7')
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    assetTypeUuid!: string;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'Blog Post', type: 'string', minimum: 4 })
    name!: string;

    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => Object)
    @ApiProperty({ type: Object, example: { field1: 'value', field2: 5 } })
    fields!: Record<string, string | number | boolean | Date>; // fieldKey and value
}

