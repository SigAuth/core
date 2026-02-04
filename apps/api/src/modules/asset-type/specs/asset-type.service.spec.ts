import { DatabaseModule } from '@/internal/database/database.module';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('AssetTypesService', () => {
    let service: AssetTypeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule],
            providers: [AssetTypeService],
        }).compile();

        service = module.get<AssetTypeService>(AssetTypeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

