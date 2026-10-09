import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { resolveStableDeviceUuid } from '@/lib/server-device';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, deviceName } = body;
    let deviceUuid = body.deviceUuid ? String(body.deviceUuid).toUpperCase().trim() : '';

    let ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0];

    const { deviceUuid: stableUuid } = await resolveStableDeviceUuid(ipAddress);
    
    if (!deviceUuid || !/^[A-Z0-9]{5,8}$/.test(deviceUuid)) {
      deviceUuid = stableUuid;
    }
    
    if (!userId || !deviceName || !deviceName.trim()) {
      return NextResponse.json({ error: 'Le nom de l\'appareil est obligatoire' }, { status: 400 });
    }

    const db = await getDbConnection();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    const [result]: any = await db.query(
      'INSERT INTO user_devices (user_id, device_uuid, device_name, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, deviceUuid, deviceName, userAgent, ipAddress]
    );
    
    const deviceId = result.insertId;

    // Create session directly after device registration
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000); 
    
    await db.query(
      'INSERT INTO user_sessions (session_token, user_id, device_id, expires_at) VALUES (?, ?, ?, ?)',
      [sessionToken, userId, deviceId, expiresAt]
    );

    const response = NextResponse.json({ success: true });
    
    // Set device tracking cookie (10 years)
    response.cookies.set({
      name: 'device_uuid',
      value: deviceUuid,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10,
    });

    // Set session cookie (90 mins)
    response.cookies.set({
      name: 'fitvault_session',
      value: sessionToken,
      httpOnly: true,
      path: '/',
      maxAge: 90 * 60,
    });
    
    return response;
  } catch (error) {
    console.error('Device registration error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
