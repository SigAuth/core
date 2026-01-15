import { AssetFieldType, AssetTypeField } from '@sigauth/generics/asset';

export function mapFieldTypeToTsType(field: AssetTypeField): string {
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
