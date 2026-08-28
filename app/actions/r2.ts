import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function subirArchivo(buffer: Buffer, fileName: string, mimeType: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);
    
    // URL temporal simulada (luego configuraremos el dominio público de R2)
    return { success: true, url: `https://pub-19af1e8f76eb4e05afd313763e965893.r2.dev/${fileName}` }; 
  } catch (error) {
    console.error("Error subiendo a R2:", error);
    return { success: false, url: null };
  }
}