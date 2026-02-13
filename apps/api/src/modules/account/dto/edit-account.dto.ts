import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsStrongPassword, IsUUID, Matches, MinLength } from 'class-validator';

export class EditAccountDto {
    @IsUUID()
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', type: 'string', description: 'UUID of the account to edit' })
    uuid!: string;

    @IsString()
    @MinLength(4)
    @Matches(/^[a-zA-Z0-9_-]+$/, {
        message: 'Only Letters, Digits, - and _ allowed, no spaces',
    })
    @ApiProperty({ example: 'admin', type: 'string', description: 'Only Letters, Digits, - and _ allowed, no spaces' })
    username?: string;
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

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ example: true, type: 'boolean', description: 'Whether the account is activated or not' })
    deactivated?: boolean;
}
