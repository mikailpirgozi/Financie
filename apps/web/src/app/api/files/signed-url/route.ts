import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Extract the storage path from a full URL or return the path as-is
 * Handles URLs like: https://xxx.supabase.co/storage/v1/object/public/documents/path/to/file.jpg
 */
function extractStoragePath(input: string): string {
  // If it's already a path (no http), return as-is
  if (!input.startsWith('http')) {
    return input;
  }
  
  // Try to extract path from Supabase storage URL
  // Format: /storage/v1/object/public/{bucket}/{path} or /storage/v1/object/authenticated/{bucket}/{path}
  const patterns = [
    /\/storage\/v1\/object\/public\/documents\/(.+)$/,
    /\/storage\/v1\/object\/authenticated\/documents\/(.+)$/,
    /\/storage\/v1\/object\/sign\/documents\/(.+?)\?/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  
  // Last resort: try to get everything after /documents/
  const docsIndex = input.indexOf('/documents/');
  if (docsIndex !== -1) {
    return decodeURIComponent(input.substring(docsIndex + '/documents/'.length).split('?')[0]);
  }
  
  // Return original if no pattern matched
  return input;
}

/**
 * POST /api/files/signed-url
 * Generate a signed URL for private storage files
 * 
 * Body (JSON):
 * - path: Storage file path or full URL (e.g., "household-id/vehicles/record-id/file.jpeg")
 * - expiresIn?: Expiration time in seconds (default: 1 hour, max: 1 week)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path: inputPath, expiresIn = 3600 } = await request.json();

    if (!inputPath) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    // Extract storage path from URL if needed
    const storagePath = extractStoragePath(inputPath);
    
    // Log for debugging
    console.log(`[signed-url] Input: "${inputPath}" -> Storage path: "${storagePath}"`);

    // Validate expiresIn (max 1 week = 604800 seconds)
    const validExpiresIn = Math.min(Math.max(60, expiresIn), 604800);

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, validExpiresIn);

    if (error) {
      console.error('Supabase Storage signed URL error:', error, 'Path:', storagePath);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresIn: validExpiresIn,
    });
  } catch (error) {
    console.error('POST /api/files/signed-url error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/signed-url/batch
 * Generate signed URLs for multiple files
 * 
 * Body (JSON):
 * - paths: Array of storage file paths
 * - expiresIn?: Expiration time in seconds (default: 1 hour)
 */
