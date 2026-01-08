import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Controller, Logger, UseGuards } from '@nestjs/common';

@Controller('mirror')
@UseGuards(AuthGuard, IsRoot)
export class MirrorController {
    private logger: Logger = new Logger(MirrorController.name);

    constructor(private readonly mirrorService: MirrorService) {}

    // @Post('create')
    // @HttpCode(HttpStatus.CREATED)
    // @ApiCreatedResponse({
    //     description: 'Mirror created successfully',
    //     example: {
    //         id: 1,
    //         name: 'My Mirror',
    //         code: 'export class MyMirror extends Mirror { ... }',
    //         autoRun: true,
    //         autoRunInterval: 60,
    //     },
    // })
    // @ApiUnauthorizedResponse({ description: 'You are not authorized to create a mirror' })
    // @ApiBadRequestResponse({ description: 'Invalid data provided' })
    // async createMirror(@Body() createDto: CreateMirrorDto) {
    //     return this.mirrorService.createMirror(createDto);
    // }

    // @Post('edit')
    // @HttpCode(HttpStatus.OK)
    // @ApiUnauthorizedResponse({ description: 'You are not authorized to edit a mirror' })
    // @ApiBadRequestResponse({ description: 'Invalid data provided' })
    // async editMirror(@Body() editDto: EditMirrorDto) {
    //     return this.mirrorService.editMirror(editDto);
    // }

    // @Post('delete')
    // @HttpCode(HttpStatus.OK)
    // @ApiUnauthorizedResponse({ description: 'You are not authorized to delete mirrors' })
    // @ApiBadRequestResponse({ description: 'Invalid data provided' })
    // async deleteMirrors(@Body() dto: DeleteMirrorDto) {
    //     return this.mirrorService.deleteMirrors(dto.ids);
    // }

    // @Get('run')
    // @HttpCode(HttpStatus.OK)
    // @ApiOkResponse({ description: 'Mirror code executed successfully' })
    // async runMirrorCode(@Query('method') method: 'init' | 'run' | 'delete', @Query('id') id: string, @Res() res: Response) {
    //     res.setHeader('Content-Type', 'application/json; charset=utf-8');
    //     res.setHeader('Transfer-Encoding', 'chunked');

    //     res.write(`[SIGAUTH] Starting mirror ${method} for ID ${id}\n`);
    //     await this.mirrorService.runMirrorCode(method, +id, (msg: string) => {
    //         this.logger.log(`[MIRROR ${method.toUpperCase()} ${id}]: ${msg}`);
    //         res.write(msg + '\n');
    //     });
    //     res.write(`[SIGAUTH] Mirror ${method} for ID ${id} completed\n`);

    //     return res.end();
    // }
}
