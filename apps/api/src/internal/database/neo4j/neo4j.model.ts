import {
    CreateInput,
    CreateManyInput,
    DeleteInput,
    FindQuery,
    Model,
    Payload,
    UpdateInput,
} from '@/internal/database/generic/sigauth.client';

export class ModelNeo4J<T extends Record<string, any>> extends Model<T> {
    findOne<const Q extends Omit<FindQuery<T>, 'limit'>>(
        query: Q & Omit<FindQuery<T>, 'limit'> & Record<Exclude<keyof Q, 'authorization' | 'where' | 'orderBy' | 'includes'>, never>,
    ): Promise<Payload<T, Q> | null> {
        throw new Error('Method not implemented.');
    }
    findMany<const Q extends FindQuery<T>>(
        query: Q & FindQuery<T> & Record<Exclude<keyof Q, keyof FindQuery<T>>, never>,
    ): Promise<Payload<T, Q>[]> {
        throw new Error('Method not implemented.');
    }
    createOne(input: CreateInput<T>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    createMany(input: CreateManyInput<T>): Promise<T[]> {
        throw new Error('Method not implemented.');
    }
    updateOne(input: UpdateInput<T>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    updateMany(input: UpdateInput<T>): Promise<T[]> {
        throw new Error('Method not implemented.');
    }
    deleteOne(input: DeleteInput<T>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    deleteMany(input: DeleteInput<T>): Promise<T[]> {
        throw new Error('Method not implemented.');
    }
}
