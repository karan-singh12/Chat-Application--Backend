import { Injectable, BadRequestException } from "@nestjs/common";
import { LocalStorageProvider } from "../../shared/storage/local-storage.provider";

@Injectable()
export class UploadsService {
  constructor(private readonly localStorage: LocalStorageProvider) {}

  async handleMultipart(req: any): Promise<void> {
    if (typeof req.isMultipart !== "function" || !req.isMultipart()) {
      return;
    }

    const parts = req.parts();
    const body: any = {};
    const tempFiles: Array<{ part: any; buffer: Buffer }> = [];
    let fileInfo: any = undefined;

    for await (const part of parts) {
      if (part.file) {
        // Collect file stream to buffer in-memory to handle field ordering
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        tempFiles.push({
          part,
          buffer: fileBuffer,
        });
      } else {
        body[part.fieldname] = part.value;
      }
    }

    const imagePath = body.imagePath || "general";

    for (const tempFile of tempFiles) {
      const result = await this.localStorage.save({
        buffer: tempFile.buffer,
        filename: tempFile.part.filename,
        imagePath,
        fieldname: tempFile.part.fieldname,
        mimetype: tempFile.part.mimetype,
        encoding: tempFile.part.encoding,
      });

      fileInfo = {
        fieldname: result.fieldname,
        originalname: result.originalname,
        encoding: result.encoding,
        mimetype: result.mimetype,
        destination: result.destination,
        filename: result.filename,
        path: result.path,
        size: result.size,
      };
    }

    // Attach to request object to mimic Express body-parser & multer outputs
    req.body = body;
    req.file = fileInfo;
  }
}

