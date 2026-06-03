import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

const uploadsDir = path.join(process.cwd(), 'uploads');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

function cloudinaryConfigured(): boolean {
  return Boolean(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
}

export async function uploadAvatar(filePath: string): Promise<string> {
  if (cloudinaryConfigured()) {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'intellmeet/avatars',
      transformation: [{ width: 256, height: 256, crop: 'fill' }],
    });
    return result.secure_url;
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `avatar-${Date.now()}${path.extname(filePath)}`;
  const dest = path.join(uploadsDir, filename);
  await fs.copyFile(filePath, dest);
  return `/uploads/${filename}`;
}

export async function uploadRecording(buffer: Buffer, meetingId: string): Promise<string> {
  if (cloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: `intellmeet/recordings/${meetingId}` },
        (err, result) => {
          if (err || !result) reject(err || new Error('Upload failed'));
          else resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });
  }

  await fs.mkdir(path.join(uploadsDir, 'recordings'), { recursive: true });
  const filename = `recording-${meetingId}-${Date.now()}.webm`;
  const dest = path.join(uploadsDir, 'recordings', filename);
  await fs.writeFile(dest, buffer);
  return `/uploads/recordings/${filename}`;
}
