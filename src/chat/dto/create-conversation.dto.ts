import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateConversationDto {
  @ApiProperty({ description: "Target user ID to start conversation with", example: "cuid123" })
  @IsString()
  @IsNotEmpty()
  otherUserId: string;
}
