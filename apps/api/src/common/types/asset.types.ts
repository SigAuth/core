export type AssetType = {
    uuid: string;
    name: string;
    fields: (AssetTypeField | AssetTypeRelationField)[];
};

export type AssetTypeField = {
    uuid: string;
    name: string;
    type: number;
    required: boolean;
};

export type AssetTypeRelationField = AssetTypeField & {
    relationTypeConstraint: string[]; // UUIDs of AssetTypes that can be related
    allowMultiple: boolean; // Whether multiple assets can be related through that field
    referentialIntegrityStrategy: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'INVALIDATE';
};
