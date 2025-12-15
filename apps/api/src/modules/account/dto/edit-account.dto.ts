import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsPositive, IsString, IsStrongPassword, Matches, MinLength } from 'class-validator';

export class EditAccountDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 1, type: 'number', description: 'ID of the account to edit' })
    id!: number;

    @IsString()
    @MinLength(4)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Only Letters, Digits, - and _ allowed, no spaces',
    })
    @ApiProperty({ example: 'admin', type: 'string', description: 'Only Letters, Digits, - and _ allowed, no spaces' })
    name?: string;
    // TODO add pre name and surname later on

    @IsStrongPassword()
    @IsOptional()
    @ApiProperty({ example: '<PASSWORD>', type: 'string', description: 'Password must be strong' })
    password?: string;

    @IsEmail()
    @ApiProperty({ example: '<EMAIL>', type: 'string', description: 'Email must be valid' })
    email?: string;

    @IsBoolean()
    @ApiProperty({
        example: false,
        type: 'boolean',
        description: 'Whether the account should have API access via a token or not',
    })
    apiAccess?: boolean;

    @IsBoolean()
    @ApiProperty({ example: true, type: 'boolean', description: 'Whether the account is activated or not' })
    deactivated?: boolean;
}
