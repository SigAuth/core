import { StorageService } from '@/internal/database/storage.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class HasAccount implements CanActivate {
    constructor(private readonly storage: StorageService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        return !!request.account;
    }
}

