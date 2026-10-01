/**
 * ============================================================================
 * UNIFIED STORAGE SERVICE
 * HTEIM School of Ministry
 * ============================================================================
 * Provides high-speed public CDN file storage, asset synchronization,
 * and bucket management powered by Supabase Storage.
 */

import { 
  uploadToSupabaseStorage, 
  ensureSupabaseStorageUrl, 
  syncLibraryFromSupabaseBucket, 
  syncAssignmentsFromSupabaseBucket 
} from '../lib/supabaseClient';

export interface StorageUploadResult {
  publicUrl: string;
  bucket: string;
  fileName: string;
}

/**
 * Uploads a document or image file to Supabase Storage bucket.
 */
export async function uploadFileToStorage(
  bucket: 'library' | 'assignments' | 'classroom_media' | 'profile-pictures',
  fileName: string,
  fileOrDataUrl: File | string
): Promise<string> {
  return await uploadToSupabaseStorage(bucket, fileName, fileOrDataUrl);
}

/**
 * Ensures a valid Supabase Storage CDN URL for an image asset.
 */
export async function getStorageCdnUrl(
  bucket: string,
  fileName: string,
  rawUrl: string
): Promise<string> {
  return await ensureSupabaseStorageUrl(bucket, fileName, rawUrl);
}

/**
 * Synchronizes uploaded library files from Supabase Storage bucket to Library Resources state.
 */
export async function syncLibraryBucketResources(existingResources: any[]): Promise<{ updatedResources: any[]; addedCount: number }> {
  return await syncLibraryFromSupabaseBucket(existingResources);
}

/**
 * Synchronizes uploaded assignment submissions from Supabase Storage bucket to Submissions state.
 */
export async function syncAssignmentsBucketSubmissions(
  existingAssignments: any[],
  existingSubmissions: any[],
  studentsList: { name: string; email?: string }[] = [],
  currentStudentOrUserEmail?: string
) {
  return await syncAssignmentsFromSupabaseBucket(
    existingAssignments,
    existingSubmissions,
    studentsList,
    currentStudentOrUserEmail
  );
}
