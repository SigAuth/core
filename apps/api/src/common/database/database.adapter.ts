export abstract class DatabaseAdapter {
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;

    abstract query<T>(queryString: string, params?: any[]): Promise<T[]>;

    abstract createAssetType(name: string);
}