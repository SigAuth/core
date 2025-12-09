import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString } from 'class-validator';

export class OIDCAuthenticateDto {
    @IsNumberString()
    @ApiProperty({ description: 'The ID of the OIDC app to authenticate with', example: 69 })
    appId!: string;
    // TODO challenge: string;

    @IsString()
    @ApiProperty({ description: 'The redirect URI to redirect the user after authentication', example: 'https://myapp.com/redirect' })
    redirectUri!: string;
}
