import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SearchConversationDto {
  @ApiProperty({ description: "Search query", example: "Nexus" })
  @IsString()
  @IsNotEmpty()
  query: string;
}
