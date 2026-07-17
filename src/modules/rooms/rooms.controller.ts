import { Controller, Get, NotImplementedException } from "@nestjs/common";
import { RoomsService } from "./rooms.service";

@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getRooms() {
    throw new NotImplementedException(
      "Direct room endpoints are not implemented. Please use the /conversations or /groups endpoints on ChatController."
    );
  }
}

