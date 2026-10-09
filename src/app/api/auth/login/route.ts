import { NextResponse, NextRequest } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { resolveStableDeviceUuid } from '@/lib/server-device';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    let deviceUuid = body.deviceId || request.cookies.get('device_uuid')?.value;

    if (!username || !password) {
      return NextResponse.json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [rows]: any = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }
    
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');
    const { deviceUuid: stableUuid } = await resolveStableDeviceUuid(ip);

    if (!deviceUuid || !/^[A-Z0-9]{5,8}$/.test(deviceUuid)) {
      deviceUuid = stableUuid;
    }

    // Check if device_uuid exists in DB for this user
    const [deviceRows]: any = await db.query('SELECT * FROM user_devices WHERE device_uuid = ? AND user_id = ?', [deviceUuid, user.id]);
    
    if (deviceRows.length === 0) {
      return NextResponse.json({ 
        requiresDeviceRegistration: true, 
        userId: user.id,
        deviceUuid 
      });
    }
    
    // Update last_active_at
    await db.query('UPDATE user_devices SET last_active_at = NOW() WHERE id = ?', [deviceRows[0].id]);

    // Success - Generate session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 mins hard timeout
    
    await db.query(
      'INSERT INTO user_sessions (session_token, user_id, device_id, expires_at) VALUES (?, ?, ?, ?)',
      [sessionToken, user.id, deviceRows[0].id, expiresAt]
    );

    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie for session
    response.cookies.set({
      name: 'fitvault_session',
      value: sessionToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 60, // 90 mins
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
