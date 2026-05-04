import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import logger from './logger';

const {
  AWS_REGION = 'us-east-1',
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET,
} = process.env;

/**
 * Returns true when S3 credentials and bucket name are configured.
 * When false, avatar upload falls back to storing the base64 data URL directly.
 */
export function isS3Configured(): boolean {
  return Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET);
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: AWS_REGION,
      credentials:
        AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
          : undefined, // falls back to instance-profile / env-chain in production
    });
  }
  return _s3Client;
}

export interface UploadAvatarOptions {
  /** File key inside the bucket, e.g. "<userId>.jpeg" */
  key: string;
  /** Raw image bytes */
  body: Buffer;
  contentType: string;
}

/**
 * Uploads a file to the configured S3 bucket.
 * Returns the public URL.  Throws on failure.
 */
export async function uploadToS3(opts: UploadAvatarOptions): Promise<string> {
  if (!AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is not configured');

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
    // ACL: 'public-read' — remove if bucket policy handles public access
  });

  await getS3Client().send(command);

  // Standard S3 URL format — works for public buckets.
  // For private buckets you would generate a pre-signed URL here instead.
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${opts.key}`;
}

/**
 * Convenience wrapper: uploads a base64-encoded image string.
 * Falls back to returning the data URL when S3 is not configured (local dev).
 */
export async function uploadBase64Image(
  key: string,
  dataUrl: string,
): Promise<string> {
  if (!isS3Configured()) {
    logger.warn('[storage] S3 not configured — storing data URL directly (local dev fallback)');
    return dataUrl;
  }

  const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  return uploadToS3({ key, body: buffer, contentType: mimeType });
}
