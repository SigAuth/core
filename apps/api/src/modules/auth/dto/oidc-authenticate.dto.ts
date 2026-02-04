import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class OIDCAuthenticateDto {
    @IsUUID('7')
    @ApiProperty({ description: 'The client ID of the application.', example: '550e8400-e29b-41d4-a716-446655440000' })
    clientId!: string;

    @IsString()
    @ApiProperty({ description: 'The redirect URI to send the authorization code to.', example: 'https://myapp.com/redirect' })
    redirectUri!: string;

    @IsString()
    @ApiProperty({ description: 'The response type, currently only "code" is supported.', enum: ['code'], example: 'code' })
    responseType!: string;

    @IsString()
    @ApiProperty({ description: 'The scope of the access request.', example: 'openid profile email' })
    scope!: string;

    @IsString()
    @ApiProperty({
        description: 'An opaque value used by the client to maintain state between the request and callback.',
        example: 'af0ifjsldkj',
    })
    state!: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'A string value used to associate a client session with an ID token, and to mitigate replay attacks.',
        example: 'n-0S6_WzA2Mj',
    })
    nonce?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Code challenge derived from the code verifier sent by the client.',
        example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    })
    codeChallenge?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'The method used to derive the code challenge. Currently, only "S256" is supported.',
        example: 'S256',
    })
    codeChallengeMethod?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Specifies whether the Authorization Server prompts the End-User for reauthentication and consent.',
        example: 'login',
    })
    prompt?: string;
}

