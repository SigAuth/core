import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAccountStatusDto {
    @ApiProperty({
        description: 'target account id',
        example: '3',
    })
    @IsNumber()
    @IsNotEmpty()
    accountId!: number;

    @ApiProperty({
        description: 'target account state',
        enum: ['activate', 'deactivate'],
        example: 'activate',
    })
    @IsString()
    @IsIn(['activate', 'deactivate'])
    action!: 'activate' | 'deactivate';
}