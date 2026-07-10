import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateGroupDto {
  @ApiProperty({ description: "New name of the group", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: "New description of the group", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: "New URL of group avatar", required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
