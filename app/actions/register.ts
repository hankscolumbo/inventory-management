// app/actions/register.ts
'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function registerUser(data: { username: string; email: string; password: string }) {
  if (!data.username || !data.email || !data.password) {
    return { success: false, error: 'All fields are required.' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: 'Username or Email is already taken.' };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Registration Error:', error);
    return { success: false, error: 'Failed to register user.' };
  }
}