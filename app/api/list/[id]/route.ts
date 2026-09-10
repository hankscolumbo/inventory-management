// app/api/list/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await prisma.customList.deleteMany({
      where: {
        id,
        user: { email: session.user.email },
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'List not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete list:', error);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
