import cloudinary from "cloudinary";
import environmentConfig from "src/config/environment";
import streamifier from "streamifier";

const cloudinaryV2 = cloudinary.v2;
cloudinaryV2.config({
  cloud_name: environmentConfig.CLOUDINARY_CLOUD_NAME,
  api_key: environmentConfig.CLOUDINARY_API_KEY,
  api_secret: environmentConfig.CLOUDINARY_API_SECRET,
});

const streamUpload = (fileBuffer: Buffer, folderName: string): Promise<cloudinary.UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinaryV2.uploader.upload_stream({ folder: folderName }, (error, result) => {
      if (error) reject(error);
      else resolve(result!);
    });
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

export const CloudinaryProvider = { streamUpload };
