export type JSONSerializable =
    | string
    | number
    | boolean
    | null
    | { [key: string]: JSONSerializable }
    | JSONSerializable[];

export type AppPermission = {
    asset: string[];
    container: string[];
    root: string[];
};

export type AppWebFetch = {
    enabled: boolean;
    success: boolean;
    lastFetch: number;
};

export type AssetTypeField = {
    id: number;
    type: AssetFieldType;
    name: string;
    required: boolean;
    options?: string[];
};

export enum AssetFieldType {
    TEXT = 1,
    NUMBER = 2,
    CHECKFIELD = 3,
    // SELECTION = 4,
    // ASSET = 5,
    // ACCOUNT = 6,
}
