import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  /** Username or email of the user to add as a friend */
  identifier: string;
}
