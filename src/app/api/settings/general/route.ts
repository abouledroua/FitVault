import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import { RowDataPacket } from 'mysql2';

async function saveSettingsImage(file: File, prefix: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = path.join(process.cwd(), 'public', 'photo', 'settings');
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || '.png';
  const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${prefix}_${Date.now()}_${cleanName}${ext}`;
  const filepath = path.join(uploadDir, filename);
  await fs.writeFile(filepath, buffer);
  return `/photo/settings/${filename}`;
}

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT gym_name, facebook, phone, logo_url, badge_image_url, badge_template, updated_at FROM gym_settings WHERE id = 1'
    );

    if (rows && rows.length > 0) {
      return NextResponse.json({
        gym_name: rows[0].gym_name || '',
        facebook: rows[0].facebook || '',
        phone: rows[0].phone || '',
        logo_url: rows[0].logo_url || null,
        badge_image_url: rows[0].badge_image_url || null,
        badge_template: rows[0].badge_template || 'standard',
        updated_at: rows[0].updated_at || null,
      });
    }

    return NextResponse.json({
      gym_name: 'FitVault Gym',
      facebook: '',
      phone: '',
      logo_url: null,
      badge_image_url: null,
      badge_template: 'standard',
      updated_at: null,
    });
  } catch (error: any) {
    console.error('Error fetching gym settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des paramètres de la salle' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDbConnection();
    const formData = await req.formData();

    const gymName = formData.get('gym_name')?.toString() || '';
    const facebook = formData.get('facebook')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const badgeTemplate = formData.get('badge_template')?.toString() || 'standard';
    const removeLogo = formData.get('remove_logo') === 'true';
    const removeBadgeImage = formData.get('remove_badge_image') === 'true';

    const logoFile = formData.get('logo') as File | null;
    const badgeFile = formData.get('badge_image') as File | null;

    // Fetch existing settings to know current images
    const [existingRows] = await db.query<RowDataPacket[]>(
      'SELECT logo_url, badge_image_url, badge_template FROM gym_settings WHERE id = 1'
    );

    let currentLogoUrl = existingRows && existingRows[0] ? existingRows[0].logo_url : null;
    let currentBadgeImageUrl = existingRows && existingRows[0] ? existingRows[0].badge_image_url : null;

    // Handle logo
    if (removeLogo) {
      currentLogoUrl = null;
    } else if (logoFile && logoFile.size > 0 && typeof logoFile.arrayBuffer === 'function') {
      currentLogoUrl = await saveSettingsImage(logoFile, 'logo');
    }

    // Handle badge image
    if (removeBadgeImage) {
      currentBadgeImageUrl = null;
    } else if (badgeFile && badgeFile.size > 0 && typeof badgeFile.arrayBuffer === 'function') {
      currentBadgeImageUrl = await saveSettingsImage(badgeFile, 'badge');
    }

    // Upsert into gym_settings
    await db.query(
      `INSERT INTO gym_settings (id, gym_name, facebook, phone, logo_url, badge_image_url, badge_template)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         gym_name = VALUES(gym_name),
         facebook = VALUES(facebook),
         phone = VALUES(phone),
         logo_url = VALUES(logo_url),
         badge_image_url = VALUES(badge_image_url),
         badge_template = VALUES(badge_template)`,
      [gymName, facebook, phone, currentLogoUrl, currentBadgeImageUrl, badgeTemplate]
    );

    return NextResponse.json({
      success: true,
      gym_name: gymName,
      facebook,
      phone,
      logo_url: currentLogoUrl,
      badge_image_url: currentBadgeImageUrl,
      badge_template: badgeTemplate,
    });
  } catch (error: any) {
    console.error('Error saving gym settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement des paramètres' },
      { status: 500 }
    );
  }
}
