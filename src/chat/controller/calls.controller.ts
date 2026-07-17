import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CallsService } from '../service/calls.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { MESSAGES } from '../../common/constants/messages.constant';
import { CreateCallLogDto } from '../dto/create-call-log.dto';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
@UseGuards(AuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a call log entry' })
  async createCallLog(@Req() req: any, @Body() dto: CreateCallLogDto) {
    const userId  = (req.user as AuthenticatedUser).userId;
    const callLog = await this.callsService.createCallLog(userId, dto);
    return { message: MESSAGES.calls.logCreated, data: callLog };
  }

  @Get()
  @ApiOperation({ summary: 'Get call history logs for the current user' })
  async getCallHistory(@Req() req: any) {
    const userId      = (req.user as AuthenticatedUser).userId;
    const callHistory = await this.callsService.getCallHistory(userId);
    return { message: MESSAGES.calls.historyFetched, data: callHistory };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear call history for the current user' })
  async clearCallHistory(@Req() req: any) {
    const userId = (req.user as AuthenticatedUser).userId;
    await this.callsService.clearCallHistory(userId);
    return { message: MESSAGES.calls.historyCleared };
  }
}
