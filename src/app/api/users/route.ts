import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import bcrypt from 'bcrypt';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { formatDate } from '@/lib/formatters';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to save uploaded photo file
async function saveUploadedPhoto(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = path.join(process.cwd(), 'public', 'photo', 'user');
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const filepath = path.join(uploadDir, filename);
  await fs.writeFile(filepath, buffer);
  return `/photo/user/${filename}`;
}

// GET all users
export async function GET() {
  try {
    const db = await getDbConnection();
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.username,
        u.role,
        u.is_active,
        u.photo_url,
        u.created_at,
        COUNT(DISTINCT d.id) as devices_count
      FROM users u
      LEFT JOIN user_devices d ON u.id = d.user_id
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `;
    const [rows] = await db.query<RowDataPacket[]>(query);

    const formatted = rows.map(r => ({
      id: r.id,
      fullName: r.full_name,
      username: r.username,
      role: r.role,
      isActive: Boolean(r.is_active),
      photoUrl: r.photo_url || null,
      createdAt: formatDate(r.created_at),
      devicesCount: r.devices_count
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des utilisateurs' }, { status: 500 });
  }
}

// POST create user
export async function POST(request: Request) {
  try {
    let full_name = '';
    let username = '';
    let password = '';
    let role = 'staff';
    let photo_url: string | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      full_name = (formData.get('full_name') as string) || '';
      username = (formData.get('username') as string) || '';
      password = (formData.get('password') as string) || '';
      role = (formData.get('role') as string) || 'staff';

      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0 && typeof photo.arrayBuffer === 'function') {
        photo_url = await saveUploadedPhoto(photo);
      } else if (formData.has('photo_url')) {
        photo_url = (formData.get('photo_url') as string) || null;
      }
    } else {
      const body = await request.json();
      full_name = body.full_name || '';
      username = body.username || '';
      password = body.password || '';
      role = body.role || 'staff';
      photo_url = body.photo_url || null;
    }

    if (!full_name.trim() || !username.trim() || !password) {
      return NextResponse.json({ error: 'Nom complet, identifiant et mot de passe sont obligatoires' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDbConnection();

    // Check if username already exists
    const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà utilisé' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'staff';

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (full_name, username, password_hash, role, is_active, photo_url) VALUES (?, ?, ?, ?, TRUE, ?)',
      [full_name.trim(), cleanUsername, passwordHash, userRole, photo_url]
    );

    return NextResponse.json({
      success: true,
      userId: result.insertId,
      photoUrl: photo_url,
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
  }
}

// PUT update user
export async function PUT(request: Request) {
  try {
    let id: any = null;
    let full_name = '';
    let username = '';
    let password = '';
    let role = 'staff';
    let is_active = true;
    let hasPhotoUpload = false;
    let newPhotoUrl: string | null = null;
    let removePhoto = false;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = formData.get('id');
      full_name = (formData.get('full_name') as string) || '';
      username = (formData.get('username') as string) || '';
      password = (formData.get('password') as string) || '';
      role = (formData.get('role') as string) || 'staff';
      if (formData.has('is_active')) {
        is_active = formData.get('is_active') === 'true';
      }
      if (formData.get('remove_photo') === 'true') {
        removePhoto = true;
      }

      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0 && typeof photo.arrayBuffer === 'function') {
        newPhotoUrl = await saveUploadedPhoto(photo);
        hasPhotoUpload = true;
      } else if (formData.has('photo_url') && !removePhoto) {
        newPhotoUrl = (formData.get('photo_url') as string) || null;
      }
    } else {
      const body = await request.json();
      id = body.id;
      full_name = body.full_name || '';
      username = body.username || '';
      password = body.password || '';
      role = body.role || 'staff';
      is_active = body.is_active !== undefined ? Boolean(body.is_active) : true;
      removePhoto = Boolean(body.remove_photo);
      if (body.photo_url !== undefined) {
        newPhotoUrl = body.photo_url || null;
        hasPhotoUpload = true;
      }
    }

    if (!id || !full_name.trim() || !username.trim()) {
      return NextResponse.json({ error: 'ID, nom complet et identifiant obligatoires' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDbConnection();

    // Check if username taken by another user
    const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, id]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà attribué à un autre compte' }, { status: 400 });
    }

    const userRole = role === 'admin' ? 'admin' : 'staff';
    const active = is_active !== undefined ? Boolean(is_active) : true;

    // Build update query dynamically to respect photo and password changes
    const updates: string[] = ['full_name = ?', 'username = ?', 'role = ?', 'is_active = ?'];
    const params: any[] = [full_name.trim(), cleanUsername, userRole, active];

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (removePhoto) {
      updates.push('photo_url = NULL');
    } else if (hasPhotoUpload || newPhotoUrl) {
      updates.push('photo_url = ?');
      params.push(newPhotoUrl);
    }

    params.push(id);

    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return NextResponse.json({ 
      success: true, 
      photoUrl: removePhoto ? null : newPhotoUrl,
      message: 'Utilisateur mis à jour avec succès' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    const session = await getCurrentSession();
    if (session && String(session.userId) === String(id)) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte actuellement connecté' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if this is the only remaining admin
    const [adminCount]: any = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = TRUE');
    const [userToDelete]: any = await db.query('SELECT role FROM users WHERE id = ?', [id]);

    if (userToDelete.length > 0 && userToDelete[0].role === 'admin' && adminCount[0]?.count <= 1) {
      return NextResponse.json({ error: 'Impossible de supprimer le seul administrateur actif du système' }, { status: 400 });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de l\'utilisateur' }, { status: 500 });
  }
}
