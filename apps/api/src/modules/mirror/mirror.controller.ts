import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { CreateMirrorDto } from '@/modules/mirror/dto/create-mirror.dto';
import { EditMirrorDto } from '@/modules/mirror/dto/edit-mirror.dto';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Body, Controller, HttpCode, HttpStatus, Injectable, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('mirror')
@UseGuards(AuthGuard, IsRoot)
export class MirrorController {
    constructor(private readonly mirrorService: MirrorService) {}

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    @ApiCreatedResponse({
        description: 'Mirror created successfully',
        example: {
            id: 1,
            name: 'My Mirror',
            code: 'export class MyMirror extends Mirror { ... }',
            autoRun: true,
            autoRunInterval: 60,
        },
    })
    @ApiUnauthorizedResponse({ description: 'You are not authorized to create a mirror' })
    @ApiBadRequestResponse({ description: 'Invalid data provided' })
    async createMirror(@Body() createDto: CreateMirrorDto) {
        return this.mirrorService.createMirror(createDto);
    }

    @Post('edit')
    @HttpCode(HttpStatus.OK)
    @ApiUnauthorizedResponse({ description: 'You are not authorized to edit a mirror' })
    @ApiBadRequestResponse({ description: 'Invalid data provided' })
    async editMirror(@Body() editDto: EditMirrorDto) {
        return this.mirrorService.editMirror(editDto);
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    @ApiUnauthorizedResponse({ description: 'You are not authorized to delete mirrors' })
    @ApiBadRequestResponse({ description: 'Invalid data provided' })
    async deleteMirrors(@Body() ids: number[]) {
        return this.mirrorService.deleteMirrors(ids);
    }
}
