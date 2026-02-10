import { Project } from 'ts-morph';
import { AssetType } from '../../asset-type.architecture.js';
import { generateBaseTypeFile } from './base-type.generator.js';

export class SDKGenerator {
    private readonly assetTypes: AssetType[];
    private readonly project: Project;
    private readonly out: string;

    constructor(assetTypes: AssetType[], out: string) {
        this.assetTypes = assetTypes;
        this.out = out;
        this.project = new Project();
    }

    generate() {
        try {
            generateBaseTypeFile(this.project, this.assetTypes, this.out, true);
        } catch (error) {
            console.error('Error generating SDK:', error);
        }
    }
}

