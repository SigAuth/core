import { DatabaseModule } from '@/internal/database/database.module';
import { AccountService } from '@/modules/account/account.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('AccountService', () => {
    let service: AccountService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule],
            providers: [AccountService],
        }).compile();

        service = module.get<AccountService>(AccountService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

