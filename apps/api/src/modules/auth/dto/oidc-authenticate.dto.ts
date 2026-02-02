import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class OIDCAuthenticateDto {
    @IsUUID('7')
    @ApiProperty({ description: 'The UUID of the OIDC app to authenticate with', example: '550e8400-e29b-41d4-a716-446655440000' })
    appUuid!: string;
    // TODO challenge: string;

    @IsString()
    @ApiProperty({ description: 'The redirect URI to redirect the user after authentication', example: 'https://myapp.com/redirect' })
    redirectUri!: string;
}

