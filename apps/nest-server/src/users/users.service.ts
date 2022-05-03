import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserEntity } from "./entities/user.entity";
import * as uuid from "uuid";
import { EmailService } from "src/email/email.service";
import { AuthService } from "src/auth/auth.service";
import { compare, hash } from "bcrypt";
import { LocalAuthenticaionEntity } from "./entities/localAuthenticaion.entity";
import { SocialAuthenticationEntity } from "./entities/socialAuthentication.entity";

@Injectable()
export class UsersService {
  constructor(
    // repository 사용을 위해 @InjectRepository로 Service와 User와 의존관계를 주입한다.
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(LocalAuthenticaionEntity)
    private localAuthRepository: Repository<LocalAuthenticaionEntity>,
    @InjectRepository(SocialAuthenticationEntity)
    private socialAuthRepository: Repository<SocialAuthenticationEntity>,
    private connection: Connection,
    private emailService: EmailService
  ) {}

  /**
   * 입력받은 이메일로 이메일 존재여부확인
   * @param emailAddress
   * @returns
   */
  private async checkUserExists(emailAddress: string): Promise<boolean> {
    const user = this.usersRepository.findOne({
      where: { email: emailAddress },
    });
    const val = user.then(v => {
      return v === null;
    });
    return val;
  }

  /**
   * 유저 데이터 생성
   * @param userData
   * @returns
   */
  async create(userData: CreateUserDto): Promise<UserEntity> {
    const { email, username, password } = userData;
    const userExist = await this.checkUserExists(email);
    if (!userExist) {
      throw new UnprocessableEntityException(
        "해당 이메일로는 가입할 수 없습니다."
      );
    }
    const signupVerifyToken = uuid.v1();
    const user = new UserEntity();
    user.email = email;
    user.username = username;
    user.isactive = false;
    user.signupVerifyToken = signupVerifyToken;

    const localAuth = new LocalAuthenticaionEntity();
    localAuth.email = user.email;
    localAuth.password = password;
    localAuth.user = user;

    // user 정보 저장시 트랜지션 적용
    const queryRunner = this.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 트랜잭션으로 유저 정보 저장
      await queryRunner.manager.save(user);
      await queryRunner.manager.save(localAuth);

      await queryRunner.commitTransaction();

      // 가입 확인 메일 전송
      await this.emailService.sendMemberJoinVerification(
        email,
        signupVerifyToken
      );
    } catch (e) {
      console.log(e);
      await queryRunner.rollbackTransaction();
      throw new UnprocessableEntityException(
        "해당 이메일로는 가입할 수 없습니다."
      );
    } finally {
      // 직접 생성한 queryRunner는 해제해주어야 함.
      await queryRunner.release();
    }

    return user;
  }

  /**
   * 리프레시 토큰을 해쉬함수로 변환해서 DB에 업데이트
   * @param refreshToken
   * @param id
   */
  async setCurrentRefreshToken(refreshToken: string, email: string) {
    const currentHashedRefreshToken = await hash(refreshToken, 10);
    console.log(currentHashedRefreshToken);
    await this.usersRepository.update(
      { email: email },
      {
        currentHashedRefreshToken: currentHashedRefreshToken,
      }
    );
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, email: string) {
    const user = await this.findByEmail(email);
    console.log(user);

    const isRefreshTokenMatching = await compare(
      refreshToken,
      user.currentHashedRefreshToken
    );

    if (isRefreshTokenMatching) {
      return user;
    }
  }

  /**
   *
   * @param id
   * @returns
   */
  async removeRefreshToken(email: string) {
    return this.usersRepository.update(
      { email: email },
      {
        currentHashedRefreshToken: null,
      }
    );
  }

  async findAll() {
    return this.usersRepository.find();
  }

  async findByName(username: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const user = this.usersRepository.findOne({ where: { email: email } });
    if (user) {
      return user;
    }
    throw new HttpException(
      "User with this email does not exist",
      HttpStatus.NOT_FOUND
    );
  }
  async findByToken(
    signupVerifyToken: string
  ): Promise<UserEntity | undefined> {
    return this.usersRepository.findOne({
      where: { signupVerifyToken: signupVerifyToken },
    });
  }

  // async findByEmailPw(
  //   email: string,
  //   password: string
  // ): Promise<UserEntity | undefined> {
  //   return this.usersRepository.findOne({
  //     where: { email: email, password: password },
  //   });
  // }

  update(username: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${username} user`;
  }

  remove(username: string) {
    this.usersRepository.delete(username);
  }
}
