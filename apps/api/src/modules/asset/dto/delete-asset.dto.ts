import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

export class AssetDeleteIdDto {
    @IsUUID()
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    typeUuid!: string;

    @IsUUID()
    @ApiProperty({ example: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' })
    uuid!: string;
}

export class DeleteAssetDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => AssetDeleteIdDto)
    @ApiProperty({
        type: [AssetDeleteIdDto],
        minItems: 1,
        description: 'Array of asset identifiers to delete',
    })
    data!: AssetDeleteIdDto[];
}

