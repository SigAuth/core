import { AssetTypesService } from '@/modules/asset-type/asset-type.service';
import { CreateAssetTypeDto } from '@/modules/asset-type/dto/create-asset-type.dto';
import { DeleteAssetTypeDto } from '@/modules/asset-type/dto/delete-asset-type.dto';
import { EditAssetTypeDto } from '@/modules/asset-type/dto/edit-asset-type.dto';
import { AuthGuard } from '@/modules/auth/guards/authentication.guard';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AssetType } from '@sigauth/prisma-wrapper/prisma-client';

@Controller('asset-type')
@UseGuards(AuthGuard, IsRoot)
@ApiUnauthorizedResponse({ description: "Thrown when the user isn't authenticated" })
@ApiForbiddenResponse({ description: 'This route can only be called from accounts with root access' })
export class AssetTypesController {
    constructor(private readonly assetTypesService: AssetTypesService) {}

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
        const assetType: AssetType = await this.assetTypesService.createAssetType(createAssetTypeDto);
        return { assetType };
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
        const updatedAssetType = await this.assetTypesService.editAssetType(
            editAssetTypeDto.assetTypeId,
            editAssetTypeDto.updatedName,
            editAssetTypeDto.updatedFields,
        );
        return { updatedAssetType };
    }

    @Post('delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNotFoundResponse({ description: 'Not all asset types found or invalid ids provided' })
    async deleteAssetType(@Body() deleteAssetTypeDto: DeleteAssetTypeDto) {
        await this.assetTypesService.deleteAssetType(deleteAssetTypeDto.assetTypeIds);
        return;
    }
}
