import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAssetTypeDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsNumber({}, { each: true })
    @ApiProperty({ example: [1, 2, 3], type: [Number] })
    assetTypeIds!: number[];
}
