import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { CreateAssetTypeDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { DeleteAssetTypeDto } from '@/modules/asset-type/dto/delete-asset-type.dto';
import { EditAssetTypeDto } from '@/modules/asset-type/dto/edit-asset-type.dto';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Body, Controller, Get, HttpCode, HttpStatus, InternalServerErrorException, Post, UseGuards } from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AssetType } from '@sigauth/sdk/asset';

@Controller('asset-type')
@UseGuards(SDKGuard, IsRoot)
@ApiUnauthorizedResponse({ description: "Thrown when the user isn't authenticated" })
@ApiForbiddenResponse({ description: 'This route can only be called from accounts with root access' })
export class AssetTypeController {
    constructor(private readonly assetTypesService: AssetTypeService) {}

    @Post('create')
    @ApiCreatedResponse({
        description: 'Asset type created successfully',
        example: {
            assetType: {
                id: 1,
                name: 'test',
                fields: [
                    {
                        type: 2,
                        name: 'Text',
                        required: true,
                    },
                ],
            },
        },
    })
    async createAssetType(@Body() createAssetTypeDto: CreateAssetTypeDto): Promise<{ assetType: AssetType }> {
        const uuid = await this.assetTypesService.createAssetType(createAssetTypeDto);
        if (!uuid) throw new InternalServerErrorException('Failed to create asset type');
        return { assetType: (await this.assetTypesService.getAssetType(uuid))! };
    }

    @Post('edit')
    @ApiOkResponse({
        description: 'Asset type updated successfully',
        example: {
            updatedAssetType: {
                id: 1,
                name: 'test',
                fields: [
                    {
                        type: 2,
                        name: 'Text',
                        required: true,
                    },
                ],
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Asset type not found' })
    @ApiConflictResponse({ description: 'Asset typ field could not be found (duplicate or invalid id)' })
    @HttpCode(HttpStatus.OK)
    async editAssetType(@Body() editAssetTypeDto: EditAssetTypeDto): Promise<{ updatedAssetType: AssetType }> {
        const updatedAssetType = (await this.assetTypesService.editAssetType(editAssetTypeDto))!;
        return { updatedAssetType };
    }

    @Post('delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse({ description: 'Not all asset types found or invalid ids provided' })
    async deleteAssetType(@Body() deleteAssetTypeDto: DeleteAssetTypeDto) {
        await this.assetTypesService.deleteAssetType(deleteAssetTypeDto.assetTypeUuids);
        return;
    }

    @Get('all')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Asset types fetched successfully',
        example: {
            assetTypes: [
                {
                    id: 1,
                    name: 'test',
                    fields: [
                        {
                            type: 2,
                            name: 'Text',
                            required: true,
                        },
                    ],
                },
            ],
        },
    })
    async getAllAssetTypes(): Promise<{ assetTypes: AssetType[] }> {
        const assetTypes = await this.assetTypesService.getAllAssetTypes();
        return { assetTypes };
    }
}

