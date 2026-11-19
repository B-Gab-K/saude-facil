import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUrl, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UnitDto {
  @IsString() @Matches(/\S/) @MinLength(3) @MaxLength(150) name!: string;
  @IsString() @Matches(/\S/) @MinLength(10) @MaxLength(300) address!: string;
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) sourceUrl!: string;
}
export class ServiceDto {
  @IsUUID() unitId!: string;
  @IsString() @Matches(/\S/) @MinLength(3) @MaxLength(100) name!: string;
  @IsString() @Matches(/\S/) @MinLength(10) @MaxLength(500) evidence!: string;
}
export class ApprovalDto {
  @IsString() @Matches(/\S/) @MinLength(10) @MaxLength(500) evidence!: string;
}
export class ActiveDto {
  @IsBoolean() active!: boolean;
}
export class SlotDto {
  @IsUUID() serviceId!: string;
  @IsString() @Matches(/^[a-zA-Z0-9_-]{2,64}$/) resource!: string;
  @IsDateString({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) startsAt!: string;
  @IsDateString({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) endsAt!: string;
}
export class SlotQuery {
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
