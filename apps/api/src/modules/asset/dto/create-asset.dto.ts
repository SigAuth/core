import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsUUID, ValidateNested } from 'class-validator';

export class CreateAssetDto {
    @IsUUID('7')
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    assetTypeUuid!: string;

    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => Object)
    @ApiProperty({ type: Object, example: { field1: 'value', field2: 5 } })
    fields!: Record<string, string | number | boolean | Date>; // fieldKey and value
}

