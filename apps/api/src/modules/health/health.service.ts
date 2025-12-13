import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {

    async getHealthApps() {
        return "yes";
    }

}
