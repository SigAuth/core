import { DefinitiveAssetType } from 'src/asset-type.architecture.js';
import { Project } from 'ts-morph';
import { generateBaseTypeFile } from './base-type.generator.js';
import { generateClient } from './client.generator.js';

export class SDKGenerator {
    private readonly assetTypes: DefinitiveAssetType[];
    private readonly project: Project;
    private readonly out: string;

    constructor(assetTypes: DefinitiveAssetType[], out: string) {
        this.assetTypes = assetTypes;
        this.out = out;
        this.project = new Project();
    }

    generate() {
        try {
            generateBaseTypeFile(this.project, this.assetTypes, this.out);
            generateClient(this.project, this.assetTypes, this.out);
        } catch (error) {
            console.error('Error generating SDK:', error);
        }
    }
}

