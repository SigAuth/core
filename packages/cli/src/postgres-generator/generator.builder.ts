import { AssetType } from '@sigauth/generics/asset';
import { Project } from 'ts-morph';
import { BaseTypeGenerator } from './base-types.generator.js';
import { ClientGenerator } from './client.generator.js';
import { HelperGenerator } from './helper.generator.js';

export class TypeGenerator {
    private readonly assetTypes: AssetType[];
    private readonly outPath: string;
    private readonly project: Project;

    constructor(assetTypes: AssetType[], outPath: string = './src/sigauth') {
        this.assetTypes = assetTypes;
        this.outPath = outPath;
        this.project = new Project();
    }

    generate() {
        this.generateBaseTypeFile();
        this.generateClientFile();
        this.generateHelperFile();
    }

    private generateBaseTypeFile() {
        new BaseTypeGenerator(this.project, this.assetTypes, this.outPath).generate();
    }

    private generateHelperFile() {
        new HelperGenerator(this.project, this.outPath).generate();
    }

    private generateClientFile() {
        new ClientGenerator(this.project, this.assetTypes, this.outPath).generate();
    }
}

