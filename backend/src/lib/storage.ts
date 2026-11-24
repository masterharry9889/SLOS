import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@/config.js';

const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});

export interface StoredObjectMetadata {
  contentLength: number | undefined;
  contentType: string | undefined;
}

export async function createUploadUrl(fileKey: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: fileKey,
      ContentType: contentType,
    }),
    { expiresIn: config.PRESIGNED_URL_TTL_SECONDS },
  );
}

export async function createDownloadUrl(fileKey: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey }),
    { expiresIn: config.PRESIGNED_URL_TTL_SECONDS },
  );
}

export async function getObjectMetadata(fileKey: string): Promise<StoredObjectMetadata> {
  const result = await s3.send(
    new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey }),
  );
  return {
    contentLength: result.ContentLength,
    contentType: result.ContentType,
  };
}

export async function getObjectPrefix(fileKey: string): Promise<Uint8Array> {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: fileKey,
      Range: 'bytes=0-7',
    }),
  );
  if (!result.Body) return new Uint8Array();
  return result.Body.transformToByteArray();
}

export async function deleteObject(fileKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey }));
}

export async function uploadJsonExport(userId: string, value: unknown): Promise<string> {
  const key = `${userId}/exports/${randomUUID()}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: 'application/json',
    Body: JSON.stringify(value, null, 2),
  }));
  return createDownloadUrl(key);
}
