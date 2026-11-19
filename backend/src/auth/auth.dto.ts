import { IsDateString, IsEmail, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma';

export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
export class RegisterDto extends LoginDto {
  @IsString() @Matches(/\S+\s+\S+/) @MaxLength(100) nome!: string;
  @IsString() @Matches(/^\d{11}$/) cpf!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) nasc!: string;
  @IsUUID() unitId!: string;
}
export class PasswordDto {
  @IsString() @MinLength(12) @MaxLength(128) currentPassword!: string;
  @IsString() @MinLength(12) @MaxLength(128) newPassword!: string;
}
export class StaffDto extends LoginDto {
  @IsString() @Matches(/\S/) @MinLength(3) @MaxLength(100) nome!: string;
  @IsIn([Role.RECEPTION, Role.NURSE, Role.COORDINATOR]) role!: Role;
  @IsUUID() unitId!: string;
}
export class VerificationDto {
  @IsString() @Matches(/\S/) @MinLength(10) @MaxLength(500) evidence!: string;
}
