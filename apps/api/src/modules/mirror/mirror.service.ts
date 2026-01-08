import { AssetService } from '@/modules/asset/asset.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MirrorService {
    private readonly logger: Logger = new Logger(MirrorService.name);

    constructor(
        private readonly assetService: AssetService,
        // private readonly containerService: ContainerService,
    ) {}

    // async createMirror(createDto: CreateMirrorDto) {
    //     const mirror = await this.prisma.mirror.create({
    //         data: {
    //             name: createDto.name,
    //             code: '',
    //             autoRun: createDto.autoRun,
    //             autoRunInterval: createDto.autoRunInterval || 0,
    //         },
    //     });

    //     return mirror;
    // }

    // async editMirror(edit: EditMirrorDto) {
    //     const mirror = await this.prisma.mirror.findUnique({ where: { id: edit.id } });
    //     if (!mirror) throw new Error('Mirror not found');

    //     const updatedMirror = await this.prisma.mirror.update({
    //         where: { id: edit.id },
    //         data: {
    //             name: edit.name,
    //             code: edit.code, // TODO we need to store the ts code but minify it for execution
    //             autoRun: edit.autoRun,
    //             autoRunInterval: edit.autoRunInterval || 0,
    //         },
    //     });
    //     return updatedMirror;
    // }

    // async deleteMirrors(ids: number[]) {
    //     for (const id of ids) {
    //         const mirror = await this.prisma.mirror.findUnique({ where: { id } });
    //         if (!mirror) continue;

    //         if (mirror.code.trim().length != 0) {
    //             const compiled = await this.compile(mirror.code);
    //             const cb = (msg: string) => {
    //                 this.logger.log(`[MIRROR DELETE ${id}]: ${msg}`);
    //             };
    //             const instance = await this.getExecutionInstance(compiled, cb, undefined);
    //             await instance.delete(cb);
    //         }

    //         await this.prisma.mirror.delete({ where: { id } });
    //     }
    // }

    // async runMirrorCode(method: 'init' | 'run' | 'delete', id: number, callback: (message: string) => void) {
    //     const mirror = await this.prisma.mirror.findUnique({ where: { id } });
    //     if (!mirror) throw new Error('Mirror not found');

    //     if (mirror.code.trim().length != 0) {
    //         const compiled = await this.compile(mirror.code);
    //         const cb = (msg: string) => callback(msg);
    //         const dataUtils: DataUtils = {
    //             createAsset: async (name, typeId, fields) => {
    //                 return this.assetService.createOrUpdateAsset(undefined, name, typeId, fields, false);
    //             },
    //             editAsset: async (assetId, name, fields) => {
    //                 return this.assetService.createOrUpdateAsset(assetId, name, undefined, fields, false);
    //             },
    //             deleteAssets: async ids => {
    //                 await this.assetService.deleteAssets(ids);
    //             },
    //             createContainer: async (customId, name, assets, apps) => {
    //                 return this.containerService.createContainer(name, assets, apps, customId);
    //             },
    //             deleteContainers: async ids => {
    //                 await this.containerService.deleteContainers(ids);
    //             },
    //             editContainer: async (containerId, customId, name, assets, apps) => {
    //                 return this.containerService.editContainer(containerId, name, assets, apps, customId);
    //             },
    //             getAssets: async ids => {
    //                 return this.prisma.asset.findMany({ where: { id: { in: ids } } });
    //             },
    //             getAssetsByFilter: async filter => {
    //                 return this.prisma.asset.findMany({ where: filter });
    //             },
    //             getAssetType: async id => {
    //                 return this.prisma.assetType.findUnique({ where: { id } });
    //             },
    //             getContainers: async ids => {
    //                 return this.prisma.container.findMany({ where: { id: { in: ids } } });
    //             },
    //             getContainersByFilter: async filter => {
    //                 return this.prisma.container.findMany({ where: filter });
    //             },
    //         };

    //         const instance = await this.getExecutionInstance(compiled, cb, dataUtils);
    //         if (method == 'init') {
    //             await instance.init(cb);
    //             return 'OK';
    //         } else if (method == 'run') {
    //             let result = 'OK';
    //             try {
    //                 await instance.run(id, cb, dataUtils);
    //             } catch (e) {
    //                 result = 'ERROR: ' + (e as Error).message;
    //             }

    //             await this.prisma.mirror.update({
    //                 where: { id },
    //                 data: { lastRun: new Date(), lastResult: result },
    //             });
    //             return result;
    //         } else if (method == 'delete') {
    //             await instance.delete(cb);
    //             return 'OK';
    //         }
    //     }
    // }

    // private async compile(code: string): Promise<string> {
    //     const types = fs.readFileSync(require.resolve('@sigauth/generics/mirror'), 'utf-8');

    //     const compiled = await esbuild.transform(`${types}\n${code}`, {
    //         loader: 'ts',
    //         minify: true,
    //         target: ['es2020'],
    //         format: 'cjs',
    //     });

    //     return compiled.code;
    // }

    // private async getExecutionInstance(compiledCode: string, cb: Callback, dataUtils?: DataUtils): Promise<MirrorExecutor> {
    //     const script = new vm.Script(compiledCode, { filename: 'mirror.js' });
    //     const context = vm.createContext({
    //         module: { exports: {} },
    //         exports: {},
    //         fetch,
    //         dataUtils,
    //         Math,
    //         cb,
    //     });
    //     script.runInContext(context);

    //     const MirrorClass = context.module.exports.MyMirror;
    //     return new MirrorClass();
    // }
}
