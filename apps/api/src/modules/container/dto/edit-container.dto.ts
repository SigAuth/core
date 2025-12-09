import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class EditContainerDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number' })
    id!: number;

    @IsString()
    @MinLength(4)
    @ApiProperty({ example: 'My Container', type: 'string', minimum: 4 })
    name!: string;

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({ example: [1, 2, 3], type: 'array', items: { type: 'number' } })
    assets!: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({ example: [1, 2], type: 'array', items: { type: 'number' } })
    apps!: number[];
}
