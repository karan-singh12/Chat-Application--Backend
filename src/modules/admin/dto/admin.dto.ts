import { IsOptional, IsString, IsBoolean, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;    // search by email or username

  @IsOptional()
  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOnline?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class AdminTrafficFilterDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  suspicious?: boolean;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;   // ISO date string

  @IsOptional()
  @IsString()
  dateTo?: string;     // ISO date string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role?: string;
}
