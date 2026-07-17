import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { APP_CONSTANTS } from '../../common/constants/app.constant';
import { BadRequestException } from '@nestjs/common';

export interface UploadResult {
  fieldname:    string;
  originalname: string;
  encoding:     string;
  mimetype:     string;
  destination:  string;
  filename:     string;
  path:         string;
  url:          string;
  size:         number;
}

// Local storage provider (allows S3/Cloudinary migration later without changing controllers)
@Injectable()
export class LocalStorageProvider {
  private readonly allowedImageTypes = [...APP_CONSTANTS.uploads.allowedImageTypes];
  private readonly publicDir         = APP_CONSTANTS.uploads.publicDir;

  /**
   * Save a file buffer to disk and return the upload metadata.
   * @param buffer     Raw file bytes
   * @param filename   Original filename (used to extract extension)
   * @param imagePath  Sub-directory within `public/` (e.g. 'user', 'general')
   * @param fieldname  Form field name
   * @param mimetype   MIME type of the file
   * @param encoding   File encoding
   */
  async save(options: {
    buffer:    Buffer;
    filename:  string;
    imagePath: string;
    fieldname: string;
    mimetype:  string;
    encoding:  string;
  }): Promise<UploadResult> {
    const { buffer, filename, imagePath, fieldname, mimetype, encoding } = options;
    const ext = path.extname(filename).toLowerCase().replace('.', '');

    // Validate extension for image-only directories
    if (['user', 'streamer', 'billboard'].includes(imagePath)) {
      if (!this.allowedImageTypes.includes(ext as any)) {
        throw new BadRequestException(
          `Only ${this.allowedImageTypes.join(', ')} files are allowed.`
        );
      }
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), this.publicDir, imagePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file to disk
    const savedFilename = `${Date.now()}-${filename}`;
    const savePath      = path.join(uploadDir, savedFilename);
    fs.writeFileSync(savePath, buffer);

    const relativePath = `${this.publicDir}/${imagePath}/${savedFilename}`;

    return {
      fieldname,
      originalname: filename,
      encoding,
      mimetype,
      destination: `${this.publicDir}/${imagePath}`,
      filename:    savedFilename,
      path:        relativePath,
      url:         `/${relativePath}`,
      size:        buffer.length,
    };
  }

  /**
   * Delete a file from disk by its relative path.
   * Safe — does not throw if the file doesn't exist.
   */
  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
