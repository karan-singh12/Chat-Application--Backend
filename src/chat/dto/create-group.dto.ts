import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateGroupDto {
  @ApiProperty({ description: "Name of the group", example: "Nexus Team" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "Description of the group", example: "Discussing development", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: "List of member IDs to add", example: ["user1", "user2"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  memberIds: string[];

  @ApiProperty({ description: "URL of group avatar", required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
