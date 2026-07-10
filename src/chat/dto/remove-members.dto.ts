import { IsArray, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RemoveMembersDto {
  @ApiProperty({ description: "Array of user IDs to remove from the group", example: ["user1"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  memberIds: string[];
}
