import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString, Matches } from 'class-validator';

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

    @IsNumberString()
    @ApiProperty({ description: 'The ID of the OIDC app to authenticate with', example: 69 })
    appId!: number;
}
