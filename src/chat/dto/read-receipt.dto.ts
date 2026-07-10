import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReadReceiptDto {
  @ApiProperty({ description: "ID of the message being read", example: "msg123" })
  @IsString()
  @IsNotEmpty()
  messageId: string;
}
