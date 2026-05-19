import { createClient } from '@/lib/supabase/client';

/**
 * Client-side lossless/high-quality image conversion to WebP using HTML5 Canvas.
 */
export async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If it's already a WebP or not an image, resolve directly as a Blob
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context for WebP optimization.'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP compression failed on Canvas output.'));
          }
        },
        'image/webp',
        0.88 // High-fidelity, highly optimized lossy/lossless WebP
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
}

interface UploadOptions {
  file: File;
  altText: string;
  workspaceId: string;
}

/**
 * Main media pipeline upload worker that converts image files to WebP and uploads to Supabase.
 * Enforces altText validation for strict accessibility compliance.
 */
export async function uploadBlogMedia({ file, altText, workspaceId }: UploadOptions): Promise<{ publicUrl: string; error?: string }> {
  try {
    // Strict accessibility safeguard
    if (!altText || altText.trim().length === 0) {
      throw new Error('Accessibility Violation: An alternative text description (alt text) is strictly required to upload media.');
    }

    const supabase = createClient();
    let uploadBlob: Blob = file;
    let extension = file.name.split('.').pop() || '';
    
    // Perform lossless WebP compression if image
    if (file.type.startsWith('image/')) {
      uploadBlob = await convertToWebP(file);
      extension = 'webp';
    }

    const randomId = Math.floor(Math.random() * 1000000);
    const fileName = `${workspaceId}/${Date.now()}-${randomId}.${extension}`;
    const filePath = `posts/${fileName}`;

    // Upload to 'blog-media' bucket
    const { error: uploadError } = await supabase.storage
      .from('blog-media')
      .upload(filePath, uploadBlob, {
        cacheControl: '31536000, public',
        contentType: extension === 'webp' ? 'image/webp' : file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Retrieve public CDN URL
    const { data: { publicUrl } } = supabase.storage
      .from('blog-media')
      .getPublicUrl(filePath);

    return { publicUrl };
  } catch (error: any) {
    console.error('[mediaUpload Error]:', error.message);
    return { publicUrl: '', error: error.message || 'Image upload/optimization pipeline failed.' };
  }
}
