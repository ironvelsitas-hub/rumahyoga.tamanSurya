const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'rumah-yoga-secret-key-2026';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// Database setup (wajib absolut agar bisa jalan di environment hosting seperti Vercel)
const dbPath = path.join(__dirname, 'database', 'rumahyoga.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal membuka database sqlite:', dbPath);
        console.error(err);
    } else {
        console.log('✅ SQLite database terbuka:', dbPath);
    }
});


// Create tables
db.serialize(() => {
    // Members table
    db.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        package TEXT NOT NULL,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
    )`);
    
    // Registrations table
    db.run(`CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        package TEXT NOT NULL,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
    )`);
    
    // Contacts table
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        contact_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT 0
    )`);
    
    // Classes table
    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        instructor TEXT NOT NULL,
        schedule TEXT NOT NULL,
        capacity INTEGER DEFAULT 20,
        status TEXT DEFAULT 'active'
    )`);
    
    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Contact Replies Table
    db.run(`CREATE TABLE IF NOT EXISTS contact_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        reply_message TEXT NOT NULL,
        reply_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT 0,
        FOREIGN KEY (contact_id) REFERENCES contacts(id),
        FOREIGN KEY (admin_id) REFERENCES admin_users(id)
    )`);
    
    // ============ NEW: Class Bookings Table ============
    db.run(`CREATE TABLE IF NOT EXISTS class_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        class_name TEXT NOT NULL,
        instructor TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'confirmed'
    )`);
    
    // Add columns to contacts table
    db.run(`ALTER TABLE contacts ADD COLUMN is_replied BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Column is_replied already exists or added');
        }
    });
    
    db.run(`ALTER TABLE contacts ADD COLUMN user_email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Column user_email already exists or added');
        }
    });
    
    // Update existing contacts with email
    db.run(`UPDATE contacts SET user_email = email WHERE user_email IS NULL`);
    
    // Insert default admin if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO admin_users (username, password, name) VALUES (?, ?, ?)`, 
        ['admin', defaultPassword, 'Administrator']);
    
    // Insert sample classes if empty
    db.get(`SELECT COUNT(*) as count FROM classes`, (err, row) => {
        if (row && row.count === 0) {
            const sampleClasses = [
                ['Hatha Yoga', 'I Wayan', 'Senin 08:00 - 09:30', 20, 'active'],
                ['Vinyasa Flow', 'Made', 'Selasa 10:00 - 11:30', 15, 'active'],
                ['Power Yoga', 'Ketut', 'Rabu 16:00 - 17:30', 25, 'active'],
                ['Zumba', 'Putu', 'Kamis 18:00 - 19:00', 30, 'active'],
                ['Pilates', 'Nyoman', 'Jumat 09:00 - 10:30', 20, 'active']
            ];
            
            sampleClasses.forEach(cls => {
                db.run(`INSERT INTO classes (name, instructor, schedule, capacity, status) VALUES (?, ?, ?, ?, ?)`, cls);
            });
        }
    });
});

// Middleware untuk verifikasi token admin
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    jwt.verify(token.replace('Bearer ', ''), SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.adminId = decoded.id;
        next();
    });
};

// ==================== PUBLIC API (Frontend User) ====================

// Submit contact form
app.post('/api/contact', (req, res) => {
    const { name, email, phone, message } = req.body;
    
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
    }
    
    db.run(`INSERT INTO contacts (name, email, phone, message, is_read, user_email) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, phone, message, 0, email],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Gagal menyimpan pesan' });
            }
            res.json({ success: true, message: 'Pesan berhasil dikirim', id: this.lastID });
        });
});

// Register membership
app.post('/api/membership/register', (req, res) => {
    const { package: packageName, name, email, phone } = req.body;
    
    if (!packageName || !name || !email || !phone) {
        return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
    }
    
    // Cek apakah email sudah terdaftar sebagai member
    db.get(`SELECT id FROM members WHERE email = ?`, [email], (err, member) => {
        if (member) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar sebagai member' });
        }
        
        // Simpan ke tabel registrations
        db.run(`INSERT INTO registrations (name, email, phone, package, status) VALUES (?, ?, ?, ?, ?)`,
            [name, email, phone, packageName, 'pending'],
            function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Gagal mendaftar' });
                }
                res.json({ success: true, message: 'Pendaftaran berhasil', id: this.lastID });
            });
    });
});

// Get available classes (public)
app.get('/api/classes', (req, res) => {
    db.all(`SELECT * FROM classes WHERE status = 'active'`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data kelas' });
        }
        res.json({ success: true, data: rows });
    });
});

// ==================== NEW: BOOKING ENDPOINTS ====================

// Booking endpoint
app.post('/api/booking', (req, res) => {
    const { day, time, className, instructor, userEmail, userName } = req.body;
    
    if (!userEmail) {
        return res.status(400).json({ success: false, message: 'Email user diperlukan' });
    }
    
    // Check if user already booked this class
    db.get(`SELECT id FROM class_bookings WHERE day = ? AND time = ? AND user_email = ? AND status = 'confirmed'`,
        [day, time, userEmail], (err, existingBooking) => {
            if (existingBooking) {
                return res.status(400).json({ success: false, message: 'Anda sudah booking kelas ini' });
            }
            
            // Insert new booking
            db.run(`INSERT INTO class_bookings (day, time, class_name, instructor, user_email, user_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [day, time, className, instructor, userEmail, userName, 'confirmed'],
                function(err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: 'Gagal booking kelas' });
                    }
                    res.json({ success: true, message: 'Booking berhasil', id: this.lastID });
                });
        });
});

// Get user bookings
app.get('/api/bookings/:email', (req, res) => {
    const { email } = req.params;
    
    db.all(`SELECT * FROM class_bookings WHERE user_email = ? ORDER BY booking_date DESC`, [email], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data booking' });
        }
        res.json({ success: true, data: rows });
    });
});

// Get all bookings (for admin)
app.get('/api/admin/bookings', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM class_bookings ORDER BY booking_date DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data booking' });
        }
        res.json({ success: true, data: rows });
    });
});

// Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
        return res.status(401).json({ success: false, message: 'User email required' });
    }
    
    // Verify booking belongs to user
    db.get(`SELECT * FROM class_bookings WHERE id = ? AND user_email = ?`, [id, userEmail], (err, booking) => {
        if (err || !booking) {
            return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
        }
        
        db.run(`DELETE FROM class_bookings WHERE id = ?`, [id], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal membatalkan booking' });
            }
            res.json({ success: true, message: 'Booking berhasil dibatalkan' });
        });
    });
});

// ==================== ADMIN API ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(`SELECT * FROM admin_users WHERE username = ?`, [username], (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ success: false, message: 'Username atau password salah' });
        }
        
        if (bcrypt.compareSync(password, admin.password)) {
            const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ 
                success: true, 
                token: token,
                admin: { id: admin.id, name: admin.name, username: admin.username }
            });
        } else {
            res.status(401).json({ success: false, message: 'Username atau password salah' });
        }
    });
});

// Get dashboard stats
app.get('/api/admin/stats', verifyAdmin, (req, res) => {
    const stats = {};
    
    // Total members
    db.get(`SELECT COUNT(*) as count FROM members`, (err, row) => {
        stats.totalMembers = row.count;
        
        // Total registrations pending
        db.get(`SELECT COUNT(*) as count FROM registrations WHERE status = 'pending'`, (err, row2) => {
            stats.pendingRegistrations = row2.count;
            
            // Total unread messages
            db.get(`SELECT COUNT(*) as count FROM contacts WHERE is_read = 0`, (err, row3) => {
                stats.unreadMessages = row3.count;
                
                // Total bookings
                db.get(`SELECT COUNT(*) as count FROM class_bookings`, (err, row4) => {
                    stats.totalBookings = row4 ? row4.count : 0;
                    
                    // Total revenue this month
                    db.get(`SELECT SUM(CASE package 
                                WHEN 'Basic' THEN 150000 
                                WHEN 'Premium' THEN 300000 
                                WHEN 'VIP' THEN 500000 
                                ELSE 0 END) as total 
                            FROM registrations 
                            WHERE strftime('%Y-%m', registration_date) = strftime('%Y-%m', 'now') 
                            AND status = 'approved'`, (err, row5) => {
                        stats.revenue = row5.total || 0;
                        res.json({ success: true, data: stats });
                    });
                });
            });
        });
    });
});

// Get all members
app.get('/api/admin/members', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM members ORDER BY join_date DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data member' });
        }
        res.json({ success: true, data: rows });
    });
});

// Add member
app.post('/api/admin/members', verifyAdmin, (req, res) => {
    const { name, email, phone, package: packageName } = req.body;
    
    db.run(`INSERT INTO members (name, email, phone, package) VALUES (?, ?, ?, ?)`,
        [name, email, phone, packageName],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal menambah member' });
            }
            res.json({ success: true, message: 'Member berhasil ditambahkan', id: this.lastID });
        });
});

// Update member
app.put('/api/admin/members/:id', verifyAdmin, (req, res) => {
    const { name, email, phone, package: packageName, status } = req.body;
    const { id } = req.params;
    
    db.run(`UPDATE members SET name = ?, email = ?, phone = ?, package = ?, status = ? WHERE id = ?`,
        [name, email, phone, packageName, status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal update member' });
            }
            res.json({ success: true, message: 'Member berhasil diupdate' });
        });
});

// Delete member
app.delete('/api/admin/members/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM members WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal menghapus member' });
        }
        res.json({ success: true, message: 'Member berhasil dihapus' });
    });
});

// Get all registrations
app.get('/api/admin/registrations', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM registrations ORDER BY registration_date DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data pendaftaran' });
        }
        res.json({ success: true, data: rows });
    });
});

// Approve registration
app.post('/api/admin/registrations/:id/approve', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    // Get registration data
    db.get(`SELECT * FROM registrations WHERE id = ?`, [id], (err, registration) => {
        if (err || !registration) {
            return res.status(404).json({ success: false, message: 'Pendaftaran tidak ditemukan' });
        }
        
        // Add to members
        db.run(`INSERT INTO members (name, email, phone, package) VALUES (?, ?, ?, ?)`,
            [registration.name, registration.email, registration.phone, registration.package],
            function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Gagal menambah member' });
                }
                
                // Update registration status
                db.run(`UPDATE registrations SET status = 'approved' WHERE id = ?`, [id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Gagal update status' });
                    }
                    res.json({ success: true, message: 'Pendaftaran disetujui' });
                });
            });
    });
});

// Reject registration
app.delete('/api/admin/registrations/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM registrations WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal menolak pendaftaran' });
        }
        res.json({ success: true, message: 'Pendaftaran ditolak' });
    });
});

// Get all contacts
app.get('/api/admin/contacts', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM contacts ORDER BY contact_date DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data kontak' });
        }
        res.json({ success: true, data: rows });
    });
});

// Mark contact as read
app.put('/api/admin/contacts/:id/read', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(`UPDATE contacts SET is_read = 1 WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal update status' });
        }
        res.json({ success: true, message: 'Pesan ditandai sudah dibaca' });
    });
});

// Delete contact
app.delete('/api/admin/contacts/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM contacts WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal menghapus pesan' });
        }
        res.json({ success: true, message: 'Pesan berhasil dihapus' });
    });
});

// Reply to contact message
app.post('/api/admin/contacts/:id/reply', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { reply_message, user_email, user_name } = req.body;
    const adminId = req.adminId;
    
    if (!reply_message) {
        return res.status(400).json({ success: false, message: 'Pesan balasan tidak boleh kosong' });
    }
    
    // Save reply to database
    db.run(`INSERT INTO contact_replies (contact_id, admin_id, reply_message) VALUES (?, ?, ?)`,
        [id, adminId, reply_message],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Gagal menyimpan balasan' });
            }
            
            // Update contact as replied
            db.run(`UPDATE contacts SET is_replied = 1 WHERE id = ?`, [id]);
            
            res.json({ 
                success: true, 
                message: 'Balasan berhasil dikirim',
                reply_id: this.lastID 
            });
        });
});

// Get all replies for a contact
app.get('/api/admin/contacts/:id/replies', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.all(`
        SELECT cr.*, au.name as admin_name 
        FROM contact_replies cr
        JOIN admin_users au ON cr.admin_id = au.id
        WHERE cr.contact_id = ?
        ORDER BY cr.reply_date ASC
    `, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil balasan' });
        }
        res.json({ success: true, data: rows });
    });
});

// Send email reply
app.post('/api/admin/contacts/:id/send-email', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { reply_message, user_email, user_name } = req.body;
    
    // Simulasi pengiriman email untuk testing
    console.log(`📧 Email would be sent to: ${user_email}`);
    console.log(`📝 Reply message: ${reply_message}`);
    
    res.json({ success: true, message: 'Balasan berhasil dikirim (simulasi email)' });
});

// Get unread message count
app.get('/api/admin/contacts/unread-count', verifyAdmin, (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM contacts WHERE is_read = 0`, (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data' });
        }
        res.json({ success: true, count: row.count });
    });
});

// Get all classes
app.get('/api/admin/classes', verifyAdmin, (req, res) => {
    db.all(`SELECT * FROM classes ORDER BY id`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data kelas' });
        }
        res.json({ success: true, data: rows });
    });
});

// Add class
app.post('/api/admin/classes', verifyAdmin, (req, res) => {
    const { name, instructor, schedule, capacity } = req.body;
    
    db.run(`INSERT INTO classes (name, instructor, schedule, capacity) VALUES (?, ?, ?, ?)`,
        [name, instructor, schedule, capacity],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal menambah kelas' });
            }
            res.json({ success: true, message: 'Kelas berhasil ditambahkan', id: this.lastID });
        });
});

// Update class
app.put('/api/admin/classes/:id', verifyAdmin, (req, res) => {
    const { name, instructor, schedule, capacity, status } = req.body;
    const { id } = req.params;
    
    db.run(`UPDATE classes SET name = ?, instructor = ?, schedule = ?, capacity = ?, status = ? WHERE id = ?`,
        [name, instructor, schedule, capacity, status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal update kelas' });
            }
            res.json({ success: true, message: 'Kelas berhasil diupdate' });
        });
});

// Delete class
app.delete('/api/admin/classes/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM classes WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal menghapus kelas' });
        }
        res.json({ success: true, message: 'Kelas berhasil dihapus' });
    });
});

// Change admin password
app.post('/api/admin/change-password', verifyAdmin, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const adminId = req.adminId;
    
    db.get(`SELECT * FROM admin_users WHERE id = ?`, [adminId], (err, admin) => {
        if (err || !admin) {
            return res.status(404).json({ success: false, message: 'Admin tidak ditemukan' });
        }
        
        if (!bcrypt.compareSync(oldPassword, admin.password)) {
            return res.status(401).json({ success: false, message: 'Password lama salah' });
        }
        
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.run(`UPDATE admin_users SET password = ? WHERE id = ?`, [hashedPassword, adminId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Gagal mengubah password' });
            }
            res.json({ success: true, message: 'Password berhasil diubah' });
        });
    });
});

// Get statistics for charts
app.get('/api/admin/charts/registrations', verifyAdmin, (req, res) => {
    const query = `
        SELECT strftime('%Y-%m', registration_date) as month, COUNT(*) as total
        FROM registrations
        WHERE registration_date >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', registration_date)
        ORDER BY month ASC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data chart' });
        }
        res.json({ success: true, data: rows });
    });
});

// Get package distribution
app.get('/api/admin/charts/packages', verifyAdmin, (req, res) => {
    db.all(`SELECT package, COUNT(*) as total FROM registrations WHERE status = 'approved' GROUP BY package`, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal mengambil data paket' });
        }
        res.json({ success: true, data: rows });
    });
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📱 Website: http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`👤 Login Admin: username: admin | password: admin123`);
    console.log(`💬 Fitur balas pesan aktif!`);
    console.log(`📅 Fitur booking kelas aktif!`);
});