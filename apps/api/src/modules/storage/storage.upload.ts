import { ConflictException, Injectable } from '@nestjs/common';
import { allowedTypes, STORAGE_FOLDERS } from './storage.config';
import { StorageService } from './storage.service';

@Injectable()
export class StorageUpload {
  constructor(private service: StorageService) {}

  async handleReportUpload(file: Express.Multer.File) {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ConflictException(
        `File "${file.originalname}" has invalid type "${file.mimetype}". Only JPG, PNG, WEBP allowed.`,
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ConflictException(
        `File "${file.originalname}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 5MB.`,
      );
    }

    const fileUrl = await this.service.uploadToMinio({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: STORAGE_FOLDERS.REPORTS,
    });

    return fileUrl;
  }

  async handleUsersImageUpload(file: Express.Multer.File) {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ConflictException(
        `File "${file.originalname}" has invalid type "${file.mimetype}". Only JPG, PNG, WEBP allowed.`,
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ConflictException(
        `File "${file.originalname}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 5MB.`,
      );
    }

    const fileUrl = await this.service.uploadToMinio({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: STORAGE_FOLDERS.USERS,
    });

    return fileUrl;
  }
}
