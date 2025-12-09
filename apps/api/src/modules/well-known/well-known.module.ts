import { AuthModule } from '@/modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { WellKnownController } from './well-known.controller';

@Module({
    controllers: [WellKnownController],
    imports: [AuthModule],
})
export class WellKnownModule {}
