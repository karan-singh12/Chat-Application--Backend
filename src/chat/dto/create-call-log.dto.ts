import { IsString, IsNotEmpty, IsBoolean, IsInt, IsIn, Min } from 'class-validator';
import { CallStatus } from '../../common/enums/call-status.enum';

export class CreateCallLogDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  @IsIn([CallStatus.Completed, CallStatus.Missed, CallStatus.Rejected])
  status: string;

  @IsBoolean()
  video: boolean;

  @IsInt()
  @Min(0)
  /** Call duration in seconds */
  duration: number;
}
