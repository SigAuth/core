import * as fs from 'fs';
import path from 'path';
import { SigAuthConfig } from 'src/cli/config/config.types.js';
import { Project, VariableDeclarationKind } from 'ts-morph';

export class Config {
    private configPath: string;
    private content: SigAuthConfig | null = null;

    constructor(configPath: string = path.join(process.cwd(), 'sigauth.config.ts')) {
        this.configPath = configPath;
    }

    async loadConfig(): Promise<void> {
        if (!fs.existsSync(this.configPath)) {
            console.warn(`Config file not found at ${this.configPath}. Please run setup.`);
            return;
        }

        try {
            const module = await import(`file://${this.configPath}`);
            this.content = module.config || module.default;
        } catch (error) {
            console.error(`Error loading config from ${this.configPath}:`, error);
        }
    }

    get<K extends keyof SigAuthConfig>(key: K): SigAuthConfig[K] | undefined {
        return this.content ? this.content[key] : undefined;
    }

    setup(issuer: string, appId: string, appToken: string): void {
        const project = new Project();

        const sourceFile = project.createSourceFile(this.configPath, {}, { overwrite: true });
        const configData: SigAuthConfig = { issuer, appId, appToken };

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            isExported: true,
            declarations: [
                {
                    name: 'config',
                    type: 'SigAuthConfig',
                    initializer: JSON.stringify(configData, null, 2),
                },
            ],
        });

        sourceFile.insertImportDeclaration(0, {
            namedImports: ['SigAuthConfig'],
            moduleSpecifier: '@sigauth/sdk/config',
            isTypeOnly: true,
        });

        sourceFile.saveSync();
        console.log(`TypeScript configuration saved to ${this.configPath}`);
    }
}

