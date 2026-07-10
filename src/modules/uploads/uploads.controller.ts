import { Controller, Post, UseInterceptors, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { UploadsService } from "./uploads.service";
import { MultipartInterceptor } from "../../common/interceptors/multipart.interceptor";
import { AuthGuard } from "../../common/guards/auth.guard";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(MultipartInterceptor)
  async uploadFile(@Req() req: any) {
    if (!req.file) {
      throw new BadRequestException("No file uploaded");
    }

    const relativeUrl = req.file.path.startsWith("/") ? req.file.path : `/${req.file.path}`;

    return {
      message: "File uploaded successfully",
      data: {
        url: relativeUrl,
        path: req.file.path,
        filename: req.file.filename,
      },
    };
  }
}
