import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMirrorDto } from '@/modules/mirror/dto/create-mirror.dto';
import { EditMirrorDto } from '@/modules/mirror/dto/edit-mirror.dto';
import { Injectable, Logger } from '@nestjs/common';
import { MirrorExecutor } from '@sigauth/generics/mirror';
import esbuild from 'esbuild';
import vm from 'node:vm';

@Injectable()
export class MirrorService {
    private readonly logger: Logger = new Logger(MirrorService.name);

    constructor(private readonly prisma: PrismaService) {}

    async createMirror(createDto: CreateMirrorDto) {
        // // minify & compile code
        // const minify = await esbuild.transform(createDto.code, {
        //     loader: 'ts',
        //     minify: true,
        //     target: ['es2020'],
        //     format: 'esm',
        // });
        // this.logger.debug('Compiled mirror code:' + minify.code);
        // const instance = await this.getExecutionInstance(minify.code);
        // await instance.create();

        const mirror = await this.prisma.mirror.create({
            data: {
                name: createDto.name,
                code: '',
                autoRun: createDto.autoRun,
                autoRunInterval: createDto.autoRunInterval || 0,
            },
        });

        // TODO call create mirror function

        return mirror;
    }

    async editMirror(edit: EditMirrorDto) {
        const mirror = await this.prisma.mirror.findUnique({ where: { id: edit.id } });
        if (!mirror) throw new Error('Mirror not found');

        const updatedMirror = await this.prisma.mirror.update({
            where: { id: edit.id },
            data: {
                name: edit.name,
                code: edit.code, // TODO we need to store the ts code but minify it for execution
                autoRun: edit.autoRun,
                autoRunInterval: edit.autoRunInterval || 0,
            },
        });
        return updatedMirror;
    }

    async deleteMirrors(ids: number[]) {
        for (const id of ids) {
            const mirror = await this.prisma.mirror.findUnique({ where: { id } });
            if (!mirror) continue;

            const compiled = await esbuild.transform(mirror.code, {
                loader: 'ts',
                minify: true,
                target: ['es2020'],
                format: 'esm',
            });

            const instance = await this.getExecutionInstance(compiled.code);
            await instance.delete();

            await this.prisma.mirror.delete({ where: { id } });
        }
    }

    private async getExecutionInstance(compiledCode: string): Promise<MirrorExecutor> {
        const script = new vm.Script(compiledCode, { filename: 'mirror.js' });
        const context = vm.createContext({ exports: {}, require });
        await script.runInContext(context);
        const MirrorClass = context.exports.default;
        return new MirrorClass() as MirrorExecutor;
    }
}
