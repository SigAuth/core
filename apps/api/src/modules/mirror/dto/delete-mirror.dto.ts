import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class DeleteMirrorDto {
    @IsNumber({}, { each: true })
    @IsPositive({ each: true })
    @ApiProperty({ example: [1, 2, 3], type: 'array', items: { type: 'number' }, description: 'The IDs of the mirrors to delete' })
    ids!: number[];
}
