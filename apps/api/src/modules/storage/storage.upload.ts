import { ConflictException, Injectable } from '@nestjs/common';
import { allowedAudioTypes, allowedTypes, STORAGE_FOLDERS } from './storage.config';
import { StorageService } from './storage.service';

const MAX_REPORT_FILE_BYTES = 15 * 1024 * 1024; // voice notes/photos can run larger than an avatar
const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class StorageUpload {
  constructor(private service: StorageService) {}

  private assertValid(
    file: Express.Multer.File,
    acceptedMimetypes: string[],
    maxBytes: number,
    typeLabel: string,
  ): void {
    if (!acceptedMimetypes.includes(file.mimetype)) {
      throw new ConflictException(
        `File "${file.originalname}" has invalid type "${file.mimetype}". ${typeLabel}`,
      );
    }

    if (file.size > maxBytes) {
      throw new ConflictException(
        `File "${file.originalname}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`,
      );
    }
  }

  /** Used for photo and voice-note report submissions. */
  async handleReportUpload(file: Express.Multer.File): Promise<string> {
    this.assertValid(
      file,
      [...allowedTypes, ...allowedAudioTypes],
      MAX_REPORT_FILE_BYTES,
      'Only images, short videos, or voice recordings are allowed for reports.',
    );

    return this.service.uploadToMinio({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: STORAGE_FOLDERS.REPORTS,
    });
  }

  async handleUsersImageUpload(file: Express.Multer.File): Promise<string> {
    this.assertValid(
      file,
      allowedTypes,
      MAX_AVATAR_FILE_BYTES,
      'Only JPG, PNG, WEBP allowed.',
    );

    return this.service.uploadToMinio({
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: STORAGE_FOLDERS.USERS,
    });
  }
}
