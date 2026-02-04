import { DatabaseModule } from '@/internal/database/database.module';
import { AppsService } from '@/modules/app/app.service';
import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppService', () => {
    let service: AppsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule, HttpModule],
            providers: [AppsService],
        }).compile();

        service = module.get<AppsService>(AppsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

