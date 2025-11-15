import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesGuard } from './shared/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { AllModules } from './modules';
import { JwtAuthMiddleware } from './shared/middlewares';

@Module({
  imports: [DatabaseModule, ...AllModules],
  controllers: [AppController],
  providers: [AppService, { provide: 'APP_GUARD', useClass: RolesGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .exclude('/v1/auth/signup', '/v1/auth/login', '/')
      .forRoutes('*');
  }
}
