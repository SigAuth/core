import { AssetService } from '@/modules/asset/asset.service';
import { CreateAssetDto } from '@/modules/asset/dto/create-asset.dto';
import { DeleteAssetDto } from '@/modules/asset/dto/delete-asset.dto';
import { EditAssetDto } from '@/modules/asset/dto/edit-asset.dto';
import { FindAssetDto } from '@/modules/asset/dto/find-asset.dto';
import { IsRoot } from '@/modules/auth/guards/authentication.is-root.guard';
import { SDKGuard } from '@/modules/auth/guards/sdk.guard';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Asset } from '@sigauth/sdk/architecture';

@Controller('asset')
@UseGuards(SDKGuard)
@ApiUnauthorizedResponse({ description: "Thrown when the user isn't authenticated" })
@ApiForbiddenResponse({ description: 'This route can only be called from accounts with root access' })
export class AssetController {
    constructor(private readonly assetsService: AssetService) {}

    @Post('create')
    @UseGuards(IsRoot)
    @ApiCreatedResponse({
        description: 'Asset created successfully',
        example: {
            asset: {
                id: 1,
                name: 'test',
                fields: {
                    stringField: 'value',
                    numberField: 123,
                },
            },
            updatedContainers: [{ id: 3, name: 'container1', assets: [3], apps: [6] }],
        },
    })
    @ApiNotFoundResponse({ description: 'Asset type or container not found' })
    @ApiBadRequestResponse({
        description: 'There can be several reasons for this error (duplicate name, invalid id, etc.)',
        example: {
            message: 'Required fields are missing',
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    async createAsset(@Body() createAssetDto: CreateAssetDto): Promise<{ asset: Asset }> {
        const asset = await this.assetsService.createOrUpdateAsset(undefined, createAssetDto.assetTypeUuid, createAssetDto.fields);

        return { asset };
    }

    @Post('edit')
    @UseGuards(IsRoot)
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Asset updated successfully',
        example: {
            asset: {
                id: 1,
                name: 'test',
                fields: {
                    0: 'value',
                    1: 123,
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'There can be several reasons for this error (duplicate name, invalid id, etc.)',
        example: {
            message: 'Required fields are missing',
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    @ApiNotFoundResponse({ description: 'Container, asset or asset type not found' })
    async editAsset(@Body() editAssetDto: EditAssetDto): Promise<{ asset: Asset }> {
        const asset = await this.assetsService.createOrUpdateAsset(editAssetDto.uuid, editAssetDto.assetTypeUuid, editAssetDto.fields);

        return { asset };
    }

    @Post('delete')
    @UseGuards(IsRoot)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Assets deleted successfully' })
    @ApiNotFoundResponse({ description: 'Not all asset found or invalid ids provided' })
    async deleteAssets(@Body() deleteAssetsDto: DeleteAssetDto) {
        return await this.assetsService.deleteAssets(deleteAssetsDto.data);
    }

    @Get('find')
    @UseGuards(SDKGuard)
    async findAsset(@Query() q: FindAssetDto) {
        
    }
}

