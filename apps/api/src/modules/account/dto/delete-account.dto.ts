import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';

export class DeleteAccountDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsNumber({}, { each: true })
    @ApiProperty({ example: [1, 2, 3], type: [Number] })
    accountIds!: number[];
}
