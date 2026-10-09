import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

let cachedLocalMachineGuid: string | null = null;

/**
 * Gets the host machine identifier (Windows MachineGuid, or hostname fallback)
 */
export function getLocalMachineIdentifier(): string {
  if (cachedLocalMachineGuid) return cachedLocalMachineGuid;

  if (process.platform === 'win32') {
    try {
      const regOutput = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', {
        encoding: 'utf8',
        timeout: 1000
      });
      const match = regOutput.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
      if (match && match[1]) {
        cachedLocalMachineGuid = match[1].trim();
        return cachedLocalMachineGuid;
      }
    } catch {
      // Fallback if reg query fails
    }
  }

  // Fallback using hostname and platform
  cachedLocalMachineGuid = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  return cachedLocalMachineGuid;
}

/**
 * Generates a stable deterministic 7-character code ([A-Z0-9]{7}) from a seed string.
 */
export function generateDeterministicCode(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 7; i++) {
    const val = parseInt(hash.slice(i * 4, i * 4 + 4), 16);
    result += chars[val % chars.length];
  }
  return result;
}

/**
 * Resolves a stable device UUID for the incoming client request.
 * If the browser changes on the SAME device, this returns the EXACT SAME UUID.
 */
export async function resolveStableDeviceUuid(
  clientIp: string,
  hardwareFingerprint?: {
    screen?: string;
    concurrency?: number;
    glRenderer?: string;
  }
): Promise<{ deviceUuid: string; clientKey: string; isHost: boolean }> {
  const isLocalhost =
    !clientIp ||
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === 'localhost' ||
    clientIp.includes('127.0.0.1');

  let clientKey: string;

  if (isLocalhost) {
    // Exact same physical computer hosting the server
    const machineId = getLocalMachineIdentifier();
    clientKey = `host:${machineId}`;
  } else {
    // Remote LAN client (e.g. tablet or other computer)
    const hwPart = hardwareFingerprint?.glRenderer || hardwareFingerprint?.screen || 'generic';
    clientKey = `client:${clientIp}:${hwPart}`;
  }

  const db = await getDbConnection();

  // Check if this clientKey is already recorded in device_fingerprints
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT device_uuid FROM device_fingerprints WHERE client_key = ?',
    [clientKey]
  );

  if (rows.length > 0) {
    return {
      deviceUuid: rows[0].device_uuid,
      clientKey,
      isHost: isLocalhost
    };
  }

  // Generate deterministic stable 7-char code from clientKey
  const generatedUuid = generateDeterministicCode(clientKey);

  // Store in device_fingerprints
  await db.query(
    'INSERT INTO device_fingerprints (client_key, device_uuid, device_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE device_uuid = VALUES(device_uuid)',
    [clientKey, generatedUuid, isLocalhost ? 'Poste Principal (Serveur)' : `Poste ${clientIp}`]
  );

  return {
    deviceUuid: generatedUuid,
    clientKey,
    isHost: isLocalhost
  };
}
