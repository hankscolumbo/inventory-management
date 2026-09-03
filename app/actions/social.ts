// app/actions/social.ts
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TargetType = 'log' | 'list';

export async function toggleReaction(params: {
  targetId: string;
  targetType: TargetType;
  emoji: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  const { targetId, targetType, emoji } = params;
  const whereClause =
    targetType === 'log'
      ? { logId: targetId, userId: session.user.id, emoji }
      : { customListId: targetId, userId: session.user.id, emoji };

  try {
    const existing = await prisma.reaction.findFirst({ where: whereClause });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: {
          userId: session.user.id,
          emoji,
          ...(targetType === 'log' ? { logId: targetId } : { customListId: targetId }),
        },
      });
    }

    revalidatePath(targetType === 'log' ? `/log/${targetId}` : `/list/${targetId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return { success: false, error: 'Failed to update reaction' };
  }
}

export async function addComment(params: {
  targetId: string;
  targetType: TargetType;
  text: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  const { targetId, targetType, text } = params;
  if (!text.trim()) return { success: false, error: 'Comment cannot be empty' };

  try {
    await prisma.comment.create({
      data: {
        userId: session.user.id,
        text: text.trim(),
        ...(targetType === 'log' ? { logId: targetId } : { customListId: targetId }),
      },
    });

    revalidatePath(targetType === 'log' ? `/log/${targetId}` : `/list/${targetId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add comment:', error);
    return { success: false, error: 'Failed to post comment' };
  }
}

export async function deleteComment(commentId: string, targetId: string, targetType: TargetType) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.userId !== session.user.id) {
      return { success: false, error: 'Forbidden' };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    revalidatePath(targetType === 'log' ? `/log/${targetId}` : `/list/${targetId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
}