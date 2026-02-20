import { JWTPayload } from 'jose';

export interface AccountPayload extends JWTPayload {
    sub: string;
    name?: string;
}
