import { IsArray, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddMembersDto {
  @ApiProperty({ description: "Array of user IDs to add to the group", example: ["user1"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  memberIds: string[];
}
