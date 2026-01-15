import { AssetFieldType, AssetType, AssetTypeRelationField } from '@sigauth/generics/asset';
import { InterfaceDeclarationStructure, OptionalKind, Project, PropertySignatureStructure } from 'ts-morph';
import { mapFieldTypeToTsType } from './utils.js';

export class BaseTypeGenerator {
    constructor(
        private readonly project: Project,
        private readonly assetTypes: AssetType[],
        private readonly outPath: string,
    ) {}

    generate() {
        const baseTypeFile = this.project.createSourceFile(`${this.outPath}/asset-types.ts`, '', { overwrite: true });
        const interfaces: OptionalKind<InterfaceDeclarationStructure>[] = [];
        const reverseRelations: Record<string, OptionalKind<PropertySignatureStructure>[]> = {};

        // Initialize map
        this.assetTypes.forEach(t => (reverseRelations[t.uuid] = []));

        // Pre-calculate reverse relations
        for (const type of this.assetTypes) {
            for (const field of type.fields) {
                if (field.type === AssetFieldType.RELATION) {
                    const relationField = field as AssetTypeRelationField;
                    const targetType = this.assetTypes.find(t => t.uuid === relationField.targetAssetType);

                    if (targetType) {
                        const fieldNameBase = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                        const reversePropName = `${fieldNameBase}_${type.name.toLowerCase()}s`;

                        if (reverseRelations[relationField.targetAssetType]) {
                            reverseRelations[relationField.targetAssetType].push({
                                name: reversePropName,
                                type: `${type.name}[]`,
                                hasQuestionToken: true,
                                docs: [`Reverse relation from ${type.name}.${field.name}`],
                            });
                        }
                    }
                }
            }
        }

        for (const type of this.assetTypes) {
            const properties: OptionalKind<PropertySignatureStructure>[] = [];
            const referenceProperties: OptionalKind<PropertySignatureStructure>[] = [];

            for (const field of type.fields) {
                properties.push({
                    name: field.name,
                    type: mapFieldTypeToTsType(field) + (field.allowMultiple ? '[]' : ''),
                    hasQuestionToken: !field.required,
                });

                if (field.type === AssetFieldType.RELATION) {
                    const targetType = this.assetTypes.find(t => (field as AssetTypeRelationField).targetAssetType === t.uuid);
                    if (!targetType) continue;

                    // this field is only available when table is joined
                    let name = field.name.replace(/(Ids?|Uuids?|Identifiers?)$/i, '');
                    if (!name.toLowerCase().includes(targetType.name.toLowerCase())) name = name + '_' + targetType.name.toLowerCase();
                    else name = name + '_reference';

                    if (field.allowMultiple) name += 's';

                    referenceProperties.push({
                        name,
                        type: targetType.name + (field.allowMultiple ? '[]' : ''),
                        hasQuestionToken: true,
                        docs:
                            referenceProperties.length === 0
                                ? ['These fields are only available when the relation is included in the query']
                                : undefined,
                    });
                }
            }

            interfaces.push({
                name: type.name,
                isExported: true,
                properties: [...properties, ...referenceProperties, ...(reverseRelations[type.uuid] || [])],
            });
        }

        baseTypeFile.addInterfaces(interfaces);
        baseTypeFile.formatText();
        baseTypeFile.saveSync();
    }
}
