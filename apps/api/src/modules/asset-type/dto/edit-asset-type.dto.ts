import { AssetTypeFieldDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

/**
 * The 'normal' field is used to find the field by its original name
 */
export class UpdateAssetTypeFieldDto extends AssetTypeFieldDto {
    @IsOptional()
    @IsString()
    @MinLength(4)
    @MaxLength(64)
    @Matches(/^[a-zA-Z_][a-zA-Z0-9_]{3,63}$/)
    @ApiProperty({ example: 'Updated Field Name', type: 'string', required: false })
    updatedName!: string;
}

export class EditAssetTypeDto {
    @IsUUID('7')
    @ApiProperty({ description: 'UUID of the asset type', example: '550e8400-e29b-41d4-a716-446655440000', type: 'string' })
    uuid!: string;

    @IsString()
    @ApiProperty({ example: 'Blog Post', type: 'string' })
    updatedName!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateAssetTypeFieldDto)
    @ApiProperty({ type: [UpdateAssetTypeFieldDto] })
    updatedFields!: UpdateAssetTypeFieldDto[];
}

