import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteAccountDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('7', { each: true })
    @ApiProperty({ example: ['uuid1', 'uuid2', 'uuid3'], type: [String] })
    accountUuids!: string[];
}

