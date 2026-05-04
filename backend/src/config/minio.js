import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
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
