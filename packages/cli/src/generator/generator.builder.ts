import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
import { Project } from 'ts-morph';

export class TypeGenerator {
    private readonly assetTypes: AssetType[];
    private readonly outPath: string;

    constructor(assetTypes: AssetType[], outPath: string = './src/sigauth') {
        this.assetTypes = assetTypes;
        this.outPath = outPath;
    }

    generate() {
        const project = new Project();
        this.generateBaseTypeFile(project);
    }

    private generateBaseTypeFile(project: Project) {
        const baseTypeFile = project.createSourceFile(`${this.outPath}/asset-types.ts`, '', { overwrite: true });

        // todo add joinColumnNames
        for (const type of this.assetTypes) {
            baseTypeFile.addInterface({
                name: type.name,
                isExported: true,
                properties: type.fields.map(field => ({
                    name: field.name,
                    type: this.mapFieldTypeToTsType(field, type, this.assetTypes),
                    hasQuestionToken: !field.required,
                })),
            });
        }

        baseTypeFile.formatText();
        baseTypeFile.saveSync();
    }

    private mapFieldTypeToTsType(field: AssetTypeField, currentType: AssetType, allTypes: AssetType[]): string {
        switch (field.type) {
            case AssetFieldType.VARCHAR:
            case AssetFieldType.TEXT:
                return 'string';
            case AssetFieldType.INTEGER:
            case AssetFieldType.FLOAT8:
                return 'number';
            case AssetFieldType.BOOLEAN:
                return 'boolean';
            case AssetFieldType.DATE:
                return 'Date';
            case AssetFieldType.RELATION:
                const types = allTypes.filter(t => (field as AssetTypeRelationField).relationTypeConstraint.includes(t.uuid));
                return types.map(t => t.name).join(' | ');
            default:
                return 'any';
        }
    }
}
