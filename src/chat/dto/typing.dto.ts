import { IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class TypingDto {
  @ApiProperty({ description: "Conversation ID (for 1:1 DMs)", required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: "Group ID (for group chats)", required: false })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiProperty({ description: "Whether the user is currently typing", example: true })
  @IsBoolean()
  isTyping: boolean;
}
