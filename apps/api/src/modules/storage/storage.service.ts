import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { ENV } from 'src/common/config/env.config';

@Injectable()
export class StorageService {
  private minioClient: Minio.Client;

  private readonly DEFAULT_BUCKET =
    ENV.NODE_ENV === 'development' ? ENV.MINIO_BUCKET_DEV : ENV.MINIO_BUCKET;

  private readonly DEFAULT_FOLDER = 'uploads';

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: ENV.MINIO_ENDPOINT!,
      port: Number(ENV.MINIO_PORT),
      useSSL: ENV.MINIO_USESSL!,
      accessKey: ENV.MINIO_ACCESSKEY!,
      secretKey: ENV.MINIO_SECRETKEY!,
    });
  }


  async uploadToMinio({
    bucketName = this.DEFAULT_BUCKET,
    fileBuffer,
    originalName,
    mimetype,
    folder = this.DEFAULT_FOLDER,
    customFileName,
  }: {
    bucketName?: string;
    fileBuffer: Buffer;
    originalName: string;
    mimetype: string;
    folder?: string;
    customFileName?: string;
  }): Promise<string> {
    try {

      const ext = path.extname(originalName);
      const fileBaseName = customFileName ?? uuidv4();
      const fileName = `${folder}/${fileBaseName}${ext}`;

      const exists = await this.minioClient
        .bucketExists(bucketName)
        .catch(() => false);

      if (!exists) {
        await this.minioClient.makeBucket(bucketName);
      }

      await this.minioClient.putObject(
        bucketName,
        fileName,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': mimetype },
      );

      return `${ENV.MINIO_PUBLIC_URL}/${bucketName}/${fileName}`;
    } catch (error) {
      console.error('MinIO Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }


  async delete(fileUrl: string, bucketName?: string) {
    const bucket = bucketName ?? this.DEFAULT_BUCKET;

    const fileName = fileUrl.split('/').slice(-2).join('/');

    try {
      await this.minioClient.removeObject(bucket, fileName);

      return true;
    } catch (error) {
      console.error('MinIO Delete Error:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // GET FILE
  // ─────────────────────────────────────────────
  async getObject(fileUrl: string, bucketName?: string) {
    const bucket = bucketName ?? this.DEFAULT_BUCKET;

    const fileName = fileUrl.split(`/${bucket}/`)[1];

    if (!fileName) {
      throw new InternalServerErrorException('Invalid file URL');
    }

    try {
      const stream = await this.minioClient.getObject(bucket, fileName);

      return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => chunks.push(chunk));

        stream.on('end', () => resolve(Buffer.concat(chunks)));

        stream.on('error', reject);
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve file');
    }
  }


  async streamToNodeReadable(stream: any) {
    const reader = stream.getReader();

    return new Readable({
      async read() {
        const { done, value } = await reader.read();

        if (done) this.push(null);
        else this.push(value);
      },
    });
  }
}
