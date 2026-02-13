import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LoginRequestDto {
    @IsString()
    @ApiProperty({ example: 'admin', type: 'string' })
    username!: string;

    @IsString()
    @ApiProperty({ example: 'admin', type: 'string' })
    password!: string;

    @IsOptional()
    @IsNumber()
    @ApiProperty({ example: 248435, type: 'number', description: '2FA code if enabled', required: false })
    twoFactorCode?: string;
}
