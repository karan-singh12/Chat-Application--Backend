import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ description: "Conversation ID (for 1:1 DMs)", required: false })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ description: "Group conversation ID (for group chats)", required: false })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiProperty({ description: "Text content of the message", example: "Hello team!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiProperty({ description: "ID of the message being replied to", required: false })
  @IsString()
  @IsOptional()
  replyToMessageId?: string;

  @ApiProperty({ description: "URL of any attachment", required: false })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ description: "Type of the attachment (image, video, audio, file)", required: false })
  @IsString()
  @IsOptional()
  attachmentType?: string;

  @ApiProperty({ description: "Additional JSON metadata", required: false })
  @IsOptional()
  metadata?: any;
}
