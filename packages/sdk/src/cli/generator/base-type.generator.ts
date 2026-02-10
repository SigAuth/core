import { InterfaceDeclarationStructure, OptionalKind, Project, PropertySignatureStructure } from 'ts-morph';
import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '../../asset-type.architecture.js';

export const generateBaseTypeFile = (project: Project, assetTypes: AssetType[], outPath: string, includeInternals: boolean) => {
    const baseTypeFile = project.createSourceFile(`${outPath}/asset-types.ts`, '', { overwrite: true });
    const interfaces: OptionalKind<InterfaceDeclarationStructure>[] = [];
    const reverseRelations: Record<string, OptionalKind<PropertySignatureStructure>[]> = {};

    // Initialize map
    assetTypes.forEach(t => (reverseRelations[t.uuid] = []));

    // Pre-calculate reverse relations
    for (const type of assetTypes) {
        if (type.name == 'AssetType') continue; // skip base AssetType interface

        for (const field of type.fields) {
            if (field.type === AssetFieldType.RELATION) {
                const relationField = field as AssetTypeRelationField;
                const targetType = assetTypes.find(t => t.uuid === relationField.targetAssetType);

                if (targetType) {
                    const fieldNameBase = field.name.replace(/(Ids?|Uuids?|Identifiers?)$/i, '');
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

    for (const type of assetTypes) {
        if (type.name == 'AssetType') continue; // skip base AssetType interface

        const properties: OptionalKind<PropertySignatureStructure>[] = [];
        const referenceProperties: OptionalKind<PropertySignatureStructure>[] = [];

        properties.push({
            name: 'uuid',
            type: 'string',
        });

        for (const field of type.fields) {
            properties.push({
                name: field.name,
                type: mapFieldTypeToTsType(field) + (field.allowMultiple ? '[]' : ''),
                hasQuestionToken: !field.required,
            });

            if (field.type === AssetFieldType.RELATION) {
                const targetType = assetTypes.find(t => (field as AssetTypeRelationField).targetAssetType === t.uuid);
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
    if (includeInternals) {
        baseTypeFile.addStatements(`
            export type AssetType = {
                uuid: string;
                name: string;
                externalJoinKeys: string[];

                /** Reverse relation from Permission.typeUuid */
                type_permissions?: Permission[];
                /** Reverse relation from AppAccess.typeUuid */
                type_appAccesses?: AppAccess[];
                /** Reverse relation from Grant.typeUuid */
                type_grants?: Grant[];
            };

            export interface Grant {
                accountUuid: string;
                assetUuid?: string;
                typeUuid?: string;
                appUuid: string;
                permission: string;
                grantable: boolean;

                /** These fields are only available when the relation is included in the query */
                account_reference?: Account;
                app_reference?: App;
                type_reference?: AssetType;
            }

            export interface AppAccess {
                appUuid: string;
                typeUuid: string;
                find: boolean;
                create: boolean;
                edit: boolean;
                delete: boolean;

                /** These fields are only available when the relation is included in the query */
                app_reference?: App;
                type_reference?: AssetType;
            }

            export type Permission = {
                typeUuid?: string;
                appUuid: string;
                permission: string;

                /** These fields are only available when the relation is included in the query */
                app_reference?: App;
                type_reference?: AssetType;
            };
        `);
    }

    baseTypeFile.formatText();
    baseTypeFile.saveSync();
};

function mapFieldTypeToTsType(field: AssetTypeField): string {
    switch (field.type) {
        case AssetFieldType.VARCHAR:
        case AssetFieldType.TEXT:
        case AssetFieldType.RELATION:
            return 'string';
        case AssetFieldType.INTEGER:
        case AssetFieldType.FLOAT8:
            return 'number';
        case AssetFieldType.BOOLEAN:
            return 'boolean';
        case AssetFieldType.DATE:
            return 'Date';
        default:
            return 'any';
    }
}

