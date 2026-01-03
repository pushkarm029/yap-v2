import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import pino from 'pino';
import { hashUserId } from '@/lib/utils/crypto';
import { validateImageFile, MAX_IMAGE_SIZE } from '@/lib/utils/image';

const r2Logger = pino({ name: 'r2-storage' });

// Presigned URL expiry time in seconds (1 hour)
const PRESIGNED_URL_EXPIRES_IN = 3600;

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const requiredEnvVars = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ] as const;

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

function getBucketName(): string {
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error('Missing required environment variable: R2_BUCKET_NAME');
  }
  return process.env.R2_BUCKET_NAME;
}

function getPublicUrlBase(): string {
  if (!process.env.R2_PUBLIC_URL) {
    throw new Error('Missing required environment variable: R2_PUBLIC_URL');
  }
  return process.env.R2_PUBLIC_URL;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
  expiresIn: number;
}

export interface VerifyUploadResult {
  success: boolean;
  actualSize?: number;
  error?: string;
}

export interface ImageUploadConfig {
  userId: string;
  contentType: string;
  fileSize: number;
}

export function validateImageUpload(config: ImageUploadConfig): { valid: boolean; error?: string } {
  return validateImageFile({
    type: config.contentType,
    size: config.fileSize,
  });
}

export async function generatePresignedUploadUrl(
  config: ImageUploadConfig
): Promise<PresignedUploadUrl> {
  const validation = validateImageUpload(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const uuid = randomUUID();
  const ext = config.contentType.split('/')[1];
  const imageKey = `posts/${config.userId}/${timestamp}-${uuid}.${ext}`;

  try {
    const client = getR2Client();
    const bucketName = getBucketName();
    const publicUrl = getPublicUrlBase();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      ContentType: config.contentType,
      ContentLength: config.fileSize,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });

    const imagePublicUrl = `${publicUrl}/${imageKey}`;

    r2Logger.info(
      {
        userIdHash: hashUserId(config.userId),
        imageKey,
        contentType: config.contentType,
        fileSize: config.fileSize,
      },
      'Generated presigned upload URL'
    );

    return {
      uploadUrl,
      imageKey,
      publicUrl: imagePublicUrl,
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    };
  } catch (error) {
    r2Logger.error(
      {
        error,
        userIdHash: hashUserId(config.userId),
        contentType: config.contentType,
        fileSize: config.fileSize,
      },
      'Failed to generate presigned upload URL'
    );
    throw new Error('Failed to generate upload URL');
  }
}

export function getPublicUrl(imageKey: string): string {
  const publicUrlBase = getPublicUrlBase();
  return `${publicUrlBase}/${imageKey}`;
}

export function extractImageKey(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const key = url.pathname.substring(1);
    return key || null;
  } catch {
    return null;
  }
}

export async function verifyUploadedFileSize(
  imageKey: string,
  expectedSize: number
): Promise<VerifyUploadResult> {
  try {
    const client = getR2Client();
    const bucketName = getBucketName();

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
    });

    const response = await client.send(command);
    const actualSize = response.ContentLength || 0;

    if (actualSize > MAX_IMAGE_SIZE) {
      r2Logger.warn(
        {
          imageKey,
          expectedSize,
          actualSize,
          maxSize: MAX_IMAGE_SIZE,
        },
        'Uploaded file exceeds size limit'
      );

      return {
        success: false,
        actualSize,
        error: 'Uploaded file exceeds maximum size limit',
      };
    }

    if (actualSize !== expectedSize) {
      r2Logger.error(
        {
          imageKey,
          expectedSize,
          actualSize,
        },
        'Uploaded file size mismatch - verification failed'
      );

      return {
        success: false,
        error: 'uploaded file size mismatch',
      };
    }

    return {
      success: true,
      actualSize,
    };
  } catch (error) {
    r2Logger.error({ error, imageKey }, 'Failed to verify uploaded file');
    return {
      success: false,
      error: 'Failed to verify upload',
    };
  }
}
