export type AssetType = {
    uuid: string;
    name: string;
    fields: (AssetTypeField | AssetTypeRelationField)[];
};

export type AssetTypeField = {
    uuid: string;
    name: string;
    type: AssetFieldType;
    required: boolean;
};

export type AssetTypeRelationField = AssetTypeField & {
    relationTypeConstraint: string[]; // UUIDs of AssetTypes that can be related
    allowMultiple: boolean; // Whether multiple assets can be related through that field
    referentialIntegrityStrategy: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'INVALIDATE';
};

export enum AssetFieldType {
    BOOLEAN = 0,
    STRING = 1,
    NUMBER = 2,
    DATE = 3,
    RELATION = 4,
}

export type Asset = {
    uuid: string;
    name: string;
    [key: string]: string | number | boolean | Date | Asset | Asset[]; // fields with dynamic keys
};
