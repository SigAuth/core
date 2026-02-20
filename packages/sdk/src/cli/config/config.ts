import * as fs from 'fs';
import path from 'path';
import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import { SigAuthConfig } from './config.types.js';

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

    setup(issuer: string, secureCookies: boolean, audience: string): void {
        const project = new Project();

        const sourceFile = project.createSourceFile(this.configPath, {}, { overwrite: true });
        sourceFile.addStatements('import { type SigAuthConfig, env, loadEnviroment } from "@sigauth/sdk/config";');

        sourceFile.addStatements('loadEnviroment();');

        const configVariable = sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            isExported: true,
            declarations: [
                {
                    name: 'config',
                    type: 'SigAuthConfig',
                    initializer: '{}',
                },
            ],
        });

        const initializer = configVariable.getDeclarations()[0].getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
        initializer.addPropertyAssignments([
            { name: 'issuer', initializer: `'${issuer}'` },
            { name: 'secureCookies', initializer: `${secureCookies}` },
            { name: 'audience', initializer: `'${audience}'` },
            { name: 'out', initializer: "'src/sigauth/generated'" },
            { name: 'refreshThresholdSeconds', initializer: '60' },
            { name: 'appId', initializer: "env('SIGAUTH_APP_ID')" },
            { name: 'appToken', initializer: "env('SIGAUTH_APP_TOKEN')" },
        ]);

        sourceFile.saveSync();
        console.log(`TypeScript configuration saved to ${this.configPath}`);
    }

    get All() {
        return this.content;
    }
}

