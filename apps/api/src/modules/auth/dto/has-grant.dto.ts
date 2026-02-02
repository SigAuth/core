import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export class HasPermissionDto {
    @IsString()
    @Matches(/^[A-Za-z0-9_-]*:[0-9]*:[0-9]*:[0-9]*$/)
    permission!: string;

    @IsString()
    @ApiProperty({ description: 'The access token of the user', example: 'eyDSawjdgaszdgwagdsukgduigvsagdaisghdwagdsiuzdhi' })
    accessToken!: string;

    @IsString()
    @ApiProperty({ description: 'The app token of the requesting app', example: '1234567890abcdef' })
    appToken!: string;

    @IsUUID('7')
    @ApiProperty({ description: 'The UUID of the OIDC app to authenticate with', example: '550e8400-e29b-41d4-a716-446655440000' })
    appUuid!: string;
}

