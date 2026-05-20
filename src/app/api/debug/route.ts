import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const tokenPath = path.join(dataDir, '.token.json');
  
  let files: string[] = [];
  let tokenExists = false;
  let tokenContent: { has_access_token: boolean; has_refresh_token: boolean; expiry_date: number } | string | null = null;
  const cwd = process.cwd();
  
  try { files = fs.readdirSync(dataDir); } catch { files = ['ERROR: cannot read dir']; }
  tokenExists = fs.existsSync(tokenPath);
  if (tokenExists) {
    try {
      const raw = fs.readFileSync(tokenPath, 'utf-8');
      const parsed = JSON.parse(raw);
      tokenContent = { has_access_token: !!parsed.access_token, has_refresh_token: !!parsed.refresh_token, expiry_date: parsed.expiry_date };
    } catch { tokenContent = 'parse error'; }
  }

  return NextResponse.json({ cwd, dataDir, files, tokenExists, tokenContent });
}
