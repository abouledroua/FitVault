/**
 * Generates and retrieves a short, uppercase alphanumeric Device UUID
 * between 5 and 8 characters (e.g. "PFDZE6K", "7M2B9AX").
 * 
 * Ensures the device UUID remains consistent across different browsers
 * on the exact same physical device (Chrome, Edge, Firefox, Brave, etc.).
 */

export function getWebGLFingerprint(): string {
  if (typeof window === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-gl';
    const ext = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'no-ext';
    return (gl as any).getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'renderer';
  } catch {
    return 'gl-err';
  }
}

export function generateDeviceCode(): string {
  const chars = '123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
  const length = 7;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getDeviceIdentifier(): Promise<string> {
  if (typeof window === 'undefined') return 'SRV01';

  // 1. Check if we already have a machine-verified UUID in localStorage
  const cached = localStorage.getItem('fitvault_device_id');

  // 2. Contact the server to get the machine-tied hardware UUID
  try {
    const res = await fetch('/api/auth/device-uuid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screen: `${window.screen.width}x${window.screen.height}`,
        concurrency: navigator.hardwareConcurrency || 4,
        glRenderer: getWebGLFingerprint()
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.deviceUuid && /^[A-Z0-9]{5,8}$/.test(data.deviceUuid)) {
        localStorage.setItem('fitvault_device_id', data.deviceUuid);
        return data.deviceUuid;
      }
    }
  } catch (err) {
    console.warn('Could not contact /api/auth/device-uuid, using cache', err);
  }

  // 3. Fallback to cached value if server unreachable
  if (cached && /^[A-Z0-9]{5,8}$/.test(cached)) {
    return cached;
  }

  // 4. Ultimate fallback
  const fallback = generateDeviceCode();
  localStorage.setItem('fitvault_device_id', fallback);
  return fallback;
}
