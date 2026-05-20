import { NextRequest, NextResponse } from 'next/server';
import { saveToken } from '@/lib/googleCalendar';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não encontrado' }, { status: 400 });
  }

  try {
    await saveToken(code);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.json({ error: 'Erro ao salvar token de autenticação' }, { status: 500 });
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return NextResponse.redirect(`${proto}://${host}/?connected=true`);
}
