import { Type } from 'class-transformer';
import { IsDateString, IsDefined, IsIn, IsNotEmpty, IsObject, IsString, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { AppointmentStatus } from '../appointment-status';

class PatientDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100)
  nome!: string;

  @IsString() @Matches(/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/)
  cpf!: string;

  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nasc!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @Matches(/^(?:\d{15})?$/)
  sus?: string;
}

export class CreateAppointmentDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100)
  id!: string;

  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(30)
  codigo!: string;

  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(150)
  ubs!: string;

  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100)
  servico!: string;

  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;

  @IsDefined() @IsObject() @ValidateNested() @Type(() => PatientDto)
  paciente!: PatientDto;

  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(800)
  triagemResumo!: string;
}

export class UpdateAppointmentDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(Object.values(AppointmentStatus))
  status?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(150)
  ubs?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100)
  servico?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @MaxLength(1000)
  observacao?: string;
}
