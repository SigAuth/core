import { Test, TestingModule } from '@nestjs/testing';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';

describe('AssetTypesService', () => {
    let service: AssetTypeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AssetTypeService],
        }).compile();

        service = module.get<AssetTypeService>(AssetTypeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
