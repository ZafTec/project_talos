
import type { APIRoute } from 'astro';
import { addToWaitingList, initDatabase } from '@/lib/db';

// Initialize DB on first import (lazy)
initDatabase().catch(console.error);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { email, name, interest, message } = data;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      await addToWaitingList({ email, name, interest, message });

      return new Response(JSON.stringify({ success: true, message: 'Joined waitlist successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      if (dbError.message === 'Email already registered') {
        return new Response(JSON.stringify({ error: 'This email is already on the waitlist' }), {
          status: 409, // Conflict
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Database connection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
