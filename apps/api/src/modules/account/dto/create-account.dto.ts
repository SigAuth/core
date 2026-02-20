import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString, IsStrongPassword, Matches, MinLength } from 'class-validator';

export class CreateAccountDto {
    @IsString()
    @MinLength(4)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Only Letters, Digits, - and _ allowed, no spaces',
    })
    @ApiProperty({ example: 'admin', type: 'string', description: 'Only Letters, Digits, - and _ allowed, no spaces' })
    username!: string;
    // TODO add pre name and surname later on

    @IsStrongPassword()
    @ApiProperty({ example: '<PASSWORD>', type: 'string', description: 'Password must be strong' })
    password!: string;

    @IsEmail()
    @ApiProperty({ example: '<EMAIL>', type: 'string', description: 'Email must be valid' })
    email!: string;
}
