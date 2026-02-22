import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class OIDCAuthenticateDto {
    @IsUUID('7')
    @ApiProperty({ description: 'The client ID of the application.', example: '550e8400-e29b-41d4-a716-446655440000' })
    client_id!: string;

    @IsString()
    @ApiProperty({ description: 'The redirect URI to send the authorization code to.', example: 'https://myapp.com/redirect' })
    redirect_uri!: string;

    @IsString()
    @ApiProperty({ description: 'The response type, currently only "code" is supported.', enum: ['code'], example: 'code' })
    response_type!: string;

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
    code_challenge?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'The method used to derive the code challenge. Currently, only "S256" is supported.',
        example: 'S256',
    })
    code_challenge_method?: string;

    @IsOptional()
    @IsPositive()
    @IsNumber()
    @ApiProperty({ description: 'The index of the account to use for authentication if multiple accounts are available' })
    account_index?: number;
}

