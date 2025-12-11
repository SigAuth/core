import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMirrorDto {
    @IsString()
    @MinLength(4)
    @MaxLength(32)
    @ApiProperty({ example: 'My Mirror', type: 'string', minimum: 4, maximum: 32 })
    name!: string;

    @IsBoolean()
    @ApiProperty({ example: true, type: 'boolean', description: 'Whether the mirror should automatically run' })
    autoRun!: boolean;

    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 60, type: 'number', description: 'The waiting interval for automatic runs in minutes' })
    autoRunInterval!: number;
}
