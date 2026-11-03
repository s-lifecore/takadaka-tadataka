type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: { message?: string }
}

export type UploadedImage = {
  publicId: string
}

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadDrawingImage(imageBase64: string): Promise<UploadedImage> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration is missing: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are required.',
    )
  }

  const formData = new FormData()
  formData.append('file', `data:image/png;base64,${imageBase64}`)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = (await response.json()) as CloudinaryUploadResponse

  if (!response.ok || !data.public_id) {
    throw new Error(data.error?.message ?? `Cloudinary upload failed: ${response.status}`)
  }

  return { publicId: data.public_id }
}
