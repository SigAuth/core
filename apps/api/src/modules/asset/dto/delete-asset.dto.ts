import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteAssetDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('7', { each: true })
    @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440000'], type: [String], minItems: 1 })
    assetUuids!: string[];
}

