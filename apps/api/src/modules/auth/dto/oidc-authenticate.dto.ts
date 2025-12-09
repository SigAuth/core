import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class OIDCAuthenticateDto {
    @IsNumberString()
    @ApiProperty({ description: 'The ID of the OIDC app to authenticate with', example: 69 })
    appId!: string;
    // TODO challenge: string;
}
