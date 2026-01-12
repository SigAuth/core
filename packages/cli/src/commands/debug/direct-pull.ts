import { Command, Flags } from '@oclif/core';
import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
import chalk from 'chalk';
import ora from 'ora';
import { Project } from 'ts-morph';
import { DatabaseGateway } from '../../database/databse.gateway.js';
import { DatabaseUtil } from '../../database/databse.util.js';

export default class DatabaseTypePull extends Command {
    static description = 'Generates types based of asset types defined in sigauth instance';
    //  generate types based of direct data source access bypassing sigauth api

    static flags = {
        driver: Flags.string({
            char: 'd',
            description: 'Database driver to use (e.g., postgres, neo4j)',
            options: ['pg', 'neo4j'],
            required: true,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(DatabaseTypePull);

        const spinner = ora('Connecting to database…').start();
        let dbGateway: DatabaseGateway | null = DatabaseUtil.getDriver(flags.driver);
        if (dbGateway === null) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(`Unsupported driver: ${flags.driver}`);
        }

        try {
            dbGateway.connect();
            spinner.succeed('Database connection successful');
        } catch (error) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(error as Error);
        }

        // get asset types
        spinner.start('Fetching asset types…');
        const types = await dbGateway.getAssetTypes();
        spinner.succeed(`Fetched ${types.length} asset types`);
        spinner.start('Generating types...');

        const project = new Project();
        const file = project.createSourceFile('asset-types.ts', '', { overwrite: true });

        for (const type of types) {
            file.addInterface({
                name: type.name,
                properties: type.fields.map(field => ({
                    name: field.name,
                    type: this.mapFieldTypeToTsType(field, type, types),
                    hasQuestionToken: !field.required,
                })),
            });
        }

        file.formatText();
        file.saveSync();
        spinner.succeed('Type generation completed: asset-types.ts');
        this.exit(0);
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
