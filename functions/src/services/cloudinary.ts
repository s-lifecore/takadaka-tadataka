import { cloudinary, cloudinaryConfig } from '../config.js'
import { HttpError } from '../errors.js'

const dataUriPattern = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const maxImageDataLength = 8 * 1024 * 1024

export async function uploadArtworkImage(dataUri: unknown, publicId: string): Promise<string> {
  if (typeof dataUri !== 'string' || !dataUriPattern.test(dataUri)) {
    throw new HttpError(400, 'Only PNG, JPEG, or WebP data is accepted')
  }
  if (dataUri.length > maxImageDataLength) throw new HttpError(413, 'Image is too large')
  if (
    !cloudinaryConfig.cloudName ||
    !cloudinaryConfig.apiKey ||
    !cloudinaryConfig.apiSecret ||
    !cloudinaryConfig.uploadPreset
  ) {
    throw new HttpError(500, 'Cloudinary is not configured')
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    upload_preset: cloudinaryConfig.uploadPreset,
    public_id: publicId,
    overwrite: false,
    resource_type: 'image',
  })
  return result.public_id
}
