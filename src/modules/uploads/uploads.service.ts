import { Injectable, BadRequestException } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class UploadsService {
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
    const allowedTypes = ["png", "jpg", "jpeg"];

    for (const tempFile of tempFiles) {
      const ext = path.extname(tempFile.part.filename).toLowerCase().replace(".", "");
      
      if (["user", "streamer", "billboard"].includes(imagePath)) {
        if (!allowedTypes.includes(ext)) {
          throw new BadRequestException("Only png, jpg, jpeg allowed.");
        }
      }

      const uploadDir = path.join(process.cwd(), "public", imagePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}-${tempFile.part.filename}`;
      const savePath = path.join(uploadDir, filename);

      fs.writeFileSync(savePath, tempFile.buffer);

      fileInfo = {
        fieldname: tempFile.part.fieldname,
        originalname: tempFile.part.filename,
        encoding: tempFile.part.encoding,
        mimetype: tempFile.part.mimetype,
        destination: `public/${imagePath}`,
        filename: filename,
        path: `public/${imagePath}/${filename}`,
        size: tempFile.buffer.length,
      };
    }

    // Attach to request object to mimic Express body-parser & multer outputs
    req.body = body;
    req.file = fileInfo;
  }
}
