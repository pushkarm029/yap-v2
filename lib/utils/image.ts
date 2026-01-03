/**
 * Image Validation Utilities
 *
 * File type/size validation and ownership verification for image uploads.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

// =============================================================================
// FILE VALIDATION
// =============================================================================

export function isValidImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateImageFile(file: { type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  if (!isValidImageType(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

// =============================================================================
// OWNERSHIP VERIFICATION
// =============================================================================

/**
 * Verifies that the provided image URL belongs to the specified user
 * @param image_url - The full image URL to verify
 * @param user_id - The user ID that should own the image
 * @returns true if the image belongs to the user, false otherwise
 */
export function verifyImageOwnership(image_url: string, user_id: string): boolean {
  if (!image_url || !user_id) {
    return false;
  }

  // Extract the user ID from the image URL path
  // Expected format: .../posts/{user_id}/{filename}
  const urlParts = image_url.split('/');

  // Find the user_id in the path (should be second-to-last element)
  const userIdInPath = urlParts[urlParts.length - 2];

  return userIdInPath === user_id;
}
