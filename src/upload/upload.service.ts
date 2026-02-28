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
    // Support both AWS S3 and DigitalOcean Spaces
    const isAWS = this.config.get('AWS_ACCESS_KEY_ID') && this.config.get('AWS_SECRET_ACCESS_KEY');
    
    if (isAWS) {
      // AWS S3 Configuration
      this.bucket = this.config.get('AWS_S3_BUCKET', 'akodessewa-uploads');
      this.cdnUrl = this.config.get(
        'AWS_CDN_URL',
        `https://${this.bucket}.s3.${this.config.get('AWS_REGION', 'us-east-1')}.amazonaws.com`,
      );

      this.s3 = new S3Client({
        region: this.config.get('AWS_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.config.get('AWS_ACCESS_KEY_ID', ''),
          secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY', ''),
        },
        forcePathStyle: false,
      });
    } else {
      // DigitalOcean Spaces Configuration (fallback)
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
