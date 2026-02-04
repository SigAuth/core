import { DatabaseModule } from '@/internal/database/database.module';
import { AssetService } from '@/modules/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('AssetService', () => {
    let service: AssetService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule],
            providers: [AssetService],
        }).compile();

        service = module.get<AssetService>(AssetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

