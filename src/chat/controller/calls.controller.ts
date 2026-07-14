import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { CallsService } from "../service/calls.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Calls")
@ApiBearerAuth()
@Controller("calls")
@UseGuards(AuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: "Create a call log entry" })
  async createCallLog(
    @Req() req: any,
    @Body() body: { receiverId: string; status: string; video: boolean; duration: number }
  ) {
    const userId = req.user.userId;
    const callLog = await this.callsService.createCallLog(userId, body);
    return { success: true, data: callLog };
  }

  @Get()
  @ApiOperation({ summary: "Get call history logs for the current user" })
  async getCallHistory(@Req() req: any) {
    const userId = req.user.userId;
    const callHistory = await this.callsService.getCallHistory(userId);
    return { success: true, data: callHistory };
  }

  @Delete()
  @ApiOperation({ summary: "Clear call history for the current user" })
  async clearCallHistory(@Req() req: any) {
    const userId = req.user.userId;
    await this.callsService.clearCallHistory(userId);
    return { success: true, message: "Call history cleared successfully" };
  }
}
