import { AuthService } from '@/modules/auth/auth.service';
import { Controller, Get } from '@nestjs/common';
import { KeyObject } from 'crypto';

@Controller('.well-known')
export class WellKnownController {
    constructor(private readonly authService: AuthService) {}

    @Get('openid-configuration')
    async getOpenIDConfiguration() {
        const issuer = process.env.FRONTEND_URL!;

        return {
            issuer: issuer,
            authorization_endpoint: issuer + '/api/auth/oidc/authenticate',
            token_endpoint: issuer + '/api/auth/oidc/exchange',
            jwks_uri: issuer + '/.well-known/jwks.json',
            id_token_signing_alg_values_supported: ['RS256'],
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
        };
    }

    @Get('jwks.json')
    async getJWKS() {
        const jwk = (this.authService.publicKey! as KeyObject).export({ format: 'jwk' });

        jwk.use = 'sig';
        jwk.alg = 'RS256';
        jwk.kid = 'sigauth';

        return { keys: [jwk] };
    }
}
