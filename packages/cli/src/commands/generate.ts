import { Command } from '@oclif/core';
import * as dotenv from 'dotenv';

export default class GenerateTypes extends Command {
    static description = 'Generates types based of asset types defined in sigauth instance';
    // we need to use a sigauth api call for this to verify the app token and only return types the app has access to

    async run(): Promise<void> {
        dotenv.config();
    }
}
