import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';

export class UploadFactory {
  static createStorage(): IUploadProvider {
    const storageProvider = process.env.STORAGE_PROVIDER || 'local';

    switch (storageProvider) {
      case 'local':
        return new LocalStorage(process.env.UPLOAD_DIRECTORY!);
      case 'cloudflare':
        return new CloudflareStorage(
          process.env.CLOUDFLARE_ACCOUNT_ID!,
          process.env.CLOUDFLARE_ACCESS_KEY!,
          process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
          process.env.CLOUDFLARE_REGION!,
          process.env.CLOUDFLARE_BUCKETNAME!,
          process.env.CLOUDFLARE_BUCKET_URL!
        );
      case 's3':
        return new S3Storage(
          process.env.S3_BUCKET!,
          process.env.S3_REGION || 'eu-west-2',
          process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY!,
          process.env.S3_ACCESS_KEY_ID,
          process.env.S3_SECRET_ACCESS_KEY
        );
      default:
        throw new Error(`Invalid storage type ${storageProvider}`);
    }
  }
}
