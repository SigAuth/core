import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { ContainerService } from '@/modules/container/container.service';
import { CreateContainerDto } from '@/modules/container/dto/create-container.dto';
import { DeleteContainerDto } from '@/modules/container/dto/delete-container.dto';
import { EditContainerDto } from '@/modules/container/dto/edit-container.dto';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Container } from '@sigauth/generics/prisma-client';

@Controller('container')
@UseGuards(AuthGuard)
@ApiUnauthorizedResponse({ description: "Thrown when the user isn't authenticated" })
@ApiForbiddenResponse({ description: 'This route can only be called from accounts with root access' })
export class ContainerController {
    constructor(private readonly containerService: ContainerService) {}

    @Post('create')
    @UseGuards(IsRoot)
    @HttpCode(HttpStatus.CREATED)
    @ApiCreatedResponse({
        description: 'Container created successfully',
        example: {
            container: {
                id: 178,
                name: 'example-container',
                assets: [],
                apps: [],
            },
            containerAsset: {
                id: 4,
                name: 'example-asset',
                typeId: 1,
                fields: {
                    0: 178,
                    1: 'example-container',
                },
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Asset or asset type not found' })
    @ApiBadRequestResponse({
        description: 'There can be several reasons for this error (e.g blocked or invalid ids)',
        example: {
            message: 'Required fields are missing or invalid',
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    async createContainer(@Body() createContainerDto: CreateContainerDto) {
        return this.containerService.createContainer(createContainerDto.name, createContainerDto.assets, createContainerDto.apps);
    }

    @Post('edit')
    @UseGuards(IsRoot)
    @HttpCode(HttpStatus.OK)
    @HttpCode(HttpStatus.CREATED)
    @ApiOkResponse({
        description: 'Container created successfully',
        example: {
            container: {
                id: 1,
                name: 'example-container',
                assets: [],
                apps: [],
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Asset or asset type not found' })
    @ApiBadRequestResponse({
        description: 'There can be several reasons for this error (e.g blocked or invalid ids)',
        example: {
            message: 'Required fields are missing or invalid',
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    async editContainer(@Body() editContainerDto: EditContainerDto): Promise<{ container: Container }> {
        return {
            container: await this.containerService.editContainer(
                editContainerDto.id,
                editContainerDto.name,
                editContainerDto.assets,
                editContainerDto.apps,
            ),
        };
    }

    @Post('delete')
    @UseGuards(IsRoot)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Containers deleted successfully' })
    @ApiNotFoundResponse({ description: 'Not all containers found or invalid ids provided' })
    @ApiBadRequestResponse({
        description: 'There can be several reasons for this error (e.g blocked or invalid ids)',
        example: {
            message: 'Required fields are missing or invalid',
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    async deleteContainers(@Body() deleteContainersDto: DeleteContainerDto) {
        await this.containerService.deleteContainers(deleteContainersDto.containerIds);
        return;
    }
}
