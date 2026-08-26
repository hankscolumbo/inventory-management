// app/actions/updateAvatar.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function updateAvatar(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    return { success: false, error: 'You must be logged in.' };
  }

  const file = formData.get('avatar') as File;

  if (!file || file.size === 0) {
    return { success: false, error: 'Please select an image file.' };
  }

  // Validate file type & size (max 4MB)
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'File must be an image.' };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { success: false, error: 'Image must be under 4MB.' };
  }

  try {
    // 1. Upload to Vercel Blob Storage
    const blob = await put(`avatars/session.user.email-{Date.now()}.${file.type.split('/')[1]}`, file, {
      access: 'public',
    });

    // 2. Update user image in Prisma
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: blob.url },
    });

    return { success: true, url: blob.url };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return { success: false, error: 'Failed to upload image.' };
  }
}