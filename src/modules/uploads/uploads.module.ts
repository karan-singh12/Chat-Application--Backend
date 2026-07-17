import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { AuthModule } from "../../auth/auth.module";
import { LocalStorageProvider } from "../../shared/storage/local-storage.provider";

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, LocalStorageProvider],
  exports: [UploadsService, LocalStorageProvider],
})
export class UploadsModule {}

