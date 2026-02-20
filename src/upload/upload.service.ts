import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('SPACES_BUCKET', 'myikigai');
    this.cdnUrl = this.config.get(
      'SPACES_CDN_URL',
      `https://${this.bucket}.${this.config.get('SPACES_REGION', 'sfo2')}.cdn.digitaloceanspaces.com`,
    );

    this.s3 = new S3Client({
      endpoint: this.config.get('SPACES_ENDPOINT', 'https://sfo2.digitaloceanspaces.com'),
      region: this.config.get('SPACES_REGION', 'fra1'),
      credentials: {
        accessKeyId: this.config.get('SPACES_KEY', ''),
        secretAccessKey: this.config.get('SPACES_SECRET', ''),
      },
      forcePathStyle: false,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const ext = file.originalname.split('.').pop();
    const key = `akodessewa/${folder}/${uuid()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    return {
      url: `${this.cdnUrl}/${key}`,
      key,
    };
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<{ url: string; key: string }[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, folder)),
    );
    return results;
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getKeyFromUrl(url: string): string | null {
    if (!url) return null;
    const cdnPrefix = this.cdnUrl + '/';
    if (url.startsWith(cdnPrefix)) {
      return url.replace(cdnPrefix, '');
    }
    return null;
  }
}
