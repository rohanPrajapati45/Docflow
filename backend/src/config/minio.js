import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const initMinioBucket = async () => {
  const bucket = process.env.MINIO_BUCKET;
  try {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      console.log(`✅ MinIO bucket "${bucket}" created`);
    } else {
      console.log(`✅ MinIO bucket "${bucket}" already exists`);
    }
  } catch (error) {
    console.error(`❌ MinIO error: ${error.message}`);
  }
};

export { minioClient, initMinioBucket };
