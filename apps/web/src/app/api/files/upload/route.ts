import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed mime types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * POST /api/files/upload
 * Upload file to Supabase Storage
 * 
 * Body (FormData):
 * - file: File to upload
 * - householdId: Household ID (required)
 * - folder: Subfolder path (e.g., 'insurances', 'stk', 'service', 'fines')
 * - recordId: Optional record ID for subfolder
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const householdId = formData.get('householdId') as string | null;
    const folder = formData.get('folder') as string | null || 'documents';
    const recordId = formData.get('recordId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'pdf';
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
      .substring(0, 50); // Limit length
    const filename = `${sanitizedName}_${timestamp}.${extension}`;

    // Build storage path: {householdId}/{folder}/{recordId?}/{filename}
    let storagePath = `${householdId}/${folder}`;
    if (recordId) {
      storagePath += `/${recordId}`;
    }
    storagePath += `/${filename}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL (or signed URL if bucket is private)
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    // For private bucket, use signed URL instead
    // const { data: urlData, error: urlError } = await supabase.storage
    //   .from('documents')
    //   .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

    return NextResponse.json({
      success: true,
      data: {
        path: data.path,
        url: urlData.publicUrl,
        fullPath: data.fullPath,
        size: file.size,
        type: file.type,
        name: file.name,
      },
    });
  } catch (error) {
    console.error('POST /api/files/upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/upload
 * Delete file from Supabase Storage
 * 
 * Body (JSON):
 * - path: Full storage path to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await request.json();

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);

    if (error) {
      console.error('Supabase Storage delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/files/upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    );
  }
}
