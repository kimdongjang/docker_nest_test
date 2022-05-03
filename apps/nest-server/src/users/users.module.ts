import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { EmailModule } from "src/email/email.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./entities/user.entity";
import { AuthModule } from "src/auth/auth.module";
import { AuthService } from "src/auth/auth.service";
import { LocalAuthenticaionEntity } from "./entities/localAuthenticaion.entity";
import { SocialAuthenticationEntity } from "./entities/socialAuthentication.entity";

@Module({
  imports: [
    EmailModule,
    TypeOrmModule.forFeature([
      UserEntity,
      LocalAuthenticaionEntity,
      SocialAuthenticationEntity,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
