import { createBrowserClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET_NAME = "store-assets";

export type UploadResult = {
  url: string;
  path: string;
};

export type UploadError = {
  message: string;
  code?: string;
};

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): UploadError | null {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      message: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP.",
      code: "INVALID_TYPE",
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      message: "Ukuran file terlalu besar. Maksimal 2MB.",
      code: "FILE_TOO_LARGE",
    };
  }

  return null;
}

/**
 * Generate unique filename with timestamp
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `logo-${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadStoreImage(
  file: File
): Promise<UploadResult> {
  // Validate file
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const supabase = createBrowserClient();
  const fileName = generateFileName(file.name);
  const filePath = `logos/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload gagal: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteStoreImage(path: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("[DELETE_IMAGE_ERROR]", error);
    // Don't throw error, just log it
  }
}
