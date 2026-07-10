import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class EditMessageDto {
  @ApiProperty({ description: "Updated message content", example: "Hello team (edited)!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
