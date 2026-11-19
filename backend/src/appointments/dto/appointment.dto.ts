import { Type } from 'class-transformer';
import { BookingStatus } from '../../../generated/prisma';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';
export class CreateAppointmentDto {
  @IsUUID() slotId!: string;
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(800) reason = '';
}
export class UpdateAppointmentDto {
  @IsInt() @Min(1) version!: number;
  @IsEnum(BookingStatus) status!: BookingStatus;
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(1000) observation?: string;
}
export class RescheduleDto {
  @IsInt() @Min(1) version!: number;
  @IsUUID() slotId!: string;
}
export class AppointmentQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional() @IsIn(['createdAt', 'startsAt']) sort: 'createdAt' | 'startsAt' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
}
