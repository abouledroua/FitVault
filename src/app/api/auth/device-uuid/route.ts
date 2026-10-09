import { NextRequest, NextResponse } from 'next/server';
import { resolveStableDeviceUuid } from '@/lib/server-device';

export async function GET(request: NextRequest) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');

    const result = await resolveStableDeviceUuid(ip);

    const response = NextResponse.json({
      deviceUuid: result.deviceUuid,
      isHost: result.isHost
    });

    response.cookies.set({
      name: 'device_uuid',
      value: result.deviceUuid,
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 5 // 5 years
    });

    return response;
  } catch (error) {
    console.error('Error resolving device UUID:', error);
    return NextResponse.json({ error: 'Erreur lors de la résolution de l\'appareil' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is okay
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');

    const result = await resolveStableDeviceUuid(ip, {
      screen: body.screen,
      concurrency: body.concurrency,
      glRenderer: body.glRenderer
    });

    const response = NextResponse.json({
      deviceUuid: result.deviceUuid,
      isHost: result.isHost
    });

    response.cookies.set({
      name: 'device_uuid',
      value: result.deviceUuid,
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 5 // 5 years
    });

    return response;
  } catch (error) {
    console.error('Error resolving device UUID:', error);
    return NextResponse.json({ error: 'Erreur lors de la résolution de l\'appareil' }, { status: 500 });
  }
}
