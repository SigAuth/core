import { DatabaseModule } from '@/internal/database/database.module';
import { AuthService } from '@/modules/auth/auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';

describe('AuthController', () => {
    let controller: AuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule],
            controllers: [AuthController],
            providers: [AuthService],
        }).compile();

        controller = module.get<AuthController>(AuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});

