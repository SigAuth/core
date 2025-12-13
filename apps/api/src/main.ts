import { UnauthorizedExceptionFilter } from '@/common/filters/unauthorized-exception.filter';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Main');
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api', {
        exclude: [{ path: '.well-known/*path', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new UnauthorizedExceptionFilter());
    app.use(cookieParser());

    if (process.env.EXPOSE_SWAGGER === 'true') {
        const config = new DocumentBuilder()
            .setTitle('SigAuth API')
            .setDescription("The SigAuth API is rate limited and protected by 2FA. You can't send more than 10 requests per minute.")
            .setVersion('0.2')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
        logger.log('SigAuth Swagger Documentation exposed at /api/docs');
    } else {
        logger.log('SigAuth Swagger Documentation is disabled by environment variable');
    }

    await app.listen(process.env.PORT ?? 4000);
}

bootstrap()
    .then(() => console.log('API is running...'))
    .catch(console.error);
