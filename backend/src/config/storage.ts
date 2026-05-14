import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from './logger';

function env() {
  return {
    region:    process.env.AWS_REGION ?? 'us-east-1',
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket:    process.env.AWS_S3_BUCKET,
  };
}

/**
 * Returns true when S3 credentials and bucket name are configured.
 * When false, upload falls back to storing the base64 data URL directly.
 */
export function isS3Configured(): boolean {
  const { accessKey, secretKey, bucket } = env();
  return Boolean(accessKey && secretKey && bucket);
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  const { region, accessKey, secretKey } = env();
  if (!_s3Client) {
    _s3Client = new S3Client({
      region,
      credentials:
        accessKey && secretKey
          ? { accessKeyId: accessKey, secretAccessKey: secretKey }
          : undefined,
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
  const { bucket, region } = env();
  if (!bucket) throw new Error('AWS_S3_BUCKET is not configured');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
  });

  await getS3Client().send(command);

  return `https://${bucket}.s3.${region}.amazonaws.com/${opts.key}`;
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

/**
 * Uploads a raw buffer to S3 using the given key and content type.
 * Falls back to returning a data:<contentType>;base64,<base64> URL when S3 is
 * not configured (local dev).
 *
 * @param key         S3 object key, e.g. "attachments/<taskId>/<uuid>_filename.pdf"
 * @param buffer      Raw file bytes
 * @param contentType MIME type, e.g. "application/pdf"
 */
export async function uploadFileBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (!isS3Configured()) {
    logger.warn('[storage] S3 not configured — storing buffer as data URL (local dev fallback)');
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  return uploadToS3({ key, body: buffer, contentType });
}

/**
 * Deletes an object from S3 by key.
 * No-op (and logs a warning) when S3 is not configured.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const { bucket } = env();
  if (!isS3Configured() || !bucket) {
    logger.warn('[storage] S3 not configured — skipping delete for key:', key);
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await getS3Client().send(command);
}
