import { AssetService } from '@/modules/asset/asset.service';
import { CreateAssetDto } from '@/modules/asset/dto/create-asset.dto';
import { DeleteAssetDto } from '@/modules/asset/dto/delete-asset.dto';
import { EditAssetDto } from '@/modules/asset/dto/edit-asset.dto';
import { SDKCreateManyAssetDto, SDKCreateOneAssetDto } from '@/modules/asset/dto/sdk.create-asset.dto';
import { SDKDeleteManyAssetDto, SDKDeleteOneAssetDto } from '@/modules/asset/dto/sdk.delete-asset.dto';
import { FindAssetDto } from '@/modules/asset/dto/sdk.find-asset.dto';
import { SDKUpdateManyAssetDto, SDKUpdateOneAssetDto } from '@/modules/asset/dto/sdk.update-asset.dto';
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
        return await this.assetsService.remoteFindAsset(q.type, q.query);
    }

    @Post('updateOne')
    @UseGuards(SDKGuard)
    async remoteUpdateOne(@Body() q: SDKUpdateOneAssetDto) {
        return await this.assetsService.remoteUpdateOne(q.type, q.query);
    }

    @Post('updateMany')
    @UseGuards(SDKGuard)
    async remoteUpdateMany(@Body() q: SDKUpdateManyAssetDto) {
        return await this.assetsService.remoteUpdateMany(q.type, q.query);
    }

    @Post('createOne')
    @UseGuards(SDKGuard)
    async remoteCreateOne(@Body() q: SDKCreateOneAssetDto) {
        return await this.assetsService.remoteCreateOne(q.type, q.query);
    }

    @Post('createMany')
    @UseGuards(SDKGuard)
    async remoteCreateMany(@Body() q: SDKCreateManyAssetDto) {
        return await this.assetsService.remoteCreateMany(q.type, q.query);
    }

    @Post('delete')
    @UseGuards(SDKGuard)
    async remoteDelete(@Body() q: SDKDeleteOneAssetDto) {
        return await this.assetsService.remoteDeleteOne(q.type, q.query);
    }

    @Post('deleteMany')
    @UseGuards(SDKGuard)
    async remoteDeleteMany(@Body() q: SDKDeleteManyAssetDto) {
        return await this.assetsService.remoteDeleteMany(q.type, q.query);
    }
}

