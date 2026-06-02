// Admin Panel JavaScript dengan API Backend
const API_URL = 'http://localhost:3000/api/admin';
let authToken = null;
let membersTable, registrationsTable, bookingsTable, contactsTable, classesTable;

// ==================== WHATSAPP INTEGRATION VARIABLES ====================
let selectedBookings = [];
let bookingDataList = [];

// Check login status on page load
window.addEventListener('load', function() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        authToken = token;
        verifyTokenAndLoad();
    }
});

// Verify token and load dashboard
async function verifyTokenAndLoad() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';
            const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
            document.getElementById('adminName').textContent = adminData.name || 'Admin';
            
            loadDashboardData();
            loadMembers();
            loadRegistrations();
            loadBookings();
            loadContacts();
            loadClasses();
            
            updateDateTime();
            setInterval(updateDateTime, 1000);
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            authToken = null;
        }
    } catch (error) {
        console.error('Token verification failed:', error);
    }
}

// Login Handler
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            authToken = result.token;
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminData', JSON.stringify(result.admin));
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboardContent').style.display = 'block';
            document.getElementById('adminName').textContent = result.admin.name;
            
            loadDashboardData();
            loadMembers();
            loadRegistrations();
            loadBookings();
            loadContacts();
            loadClasses();
            
            updateDateTime();
            setInterval(updateDateTime, 1000);
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
        errorDiv.style.display = 'block';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    authToken = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('adminLoginForm').reset();
});

// Navigation
document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        const page = this.getAttribute('data-page');
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}Page`).classList.add('active');
    });
});

// Refresh Data
document.getElementById('refreshData').addEventListener('click', function() {
    loadDashboardData();
    if (membersTable) membersTable.ajax.reload();
    if (registrationsTable) registrationsTable.ajax.reload();
    if (bookingsTable) bookingsTable.ajax.reload();
    if (contactsTable) contactsTable.ajax.reload();
    if (classesTable) classesTable.ajax.reload();
    showNotification('Data berhasil di-refresh', 'success');
});

// Update Date Time
function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalMembers').textContent = result.data.totalMembers;
            document.getElementById('totalRegistrations').textContent = result.data.pendingRegistrations;
            document.getElementById('totalBookings').textContent = result.data.totalBookings || 0;
            document.getElementById('totalMessages').textContent = result.data.unreadMessages;
        }
        
        // Load charts
        loadCharts();
        
        // Load recent registrations
        const regResponse = await fetch(`${API_URL}/registrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const regResult = await regResponse.json();
        
        if (regResult.success) {
            const recentTable = document.querySelector('#recentRegistrations tbody');
            recentTable.innerHTML = '';
            regResult.data.slice(-5).reverse().forEach(reg => {
                recentTable.innerHTML += `
                    <tr>
                        <td>${new Date(reg.registration_date).toLocaleDateString('id-ID')}</td>
                        <td>${reg.name}</td>
                        <td>${reg.package}</td>
                        <td><span class="status-badge status-${reg.status === 'approved' ? 'active' : 'pending'}">${reg.status || 'Pending'}</span></td>
                    </tr>
                `;
            });
        }
        
        // Load unread count
        await loadUnreadCount();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Unread Count
async function loadUnreadCount() {
    try {
        const response = await fetch(`${API_URL}/contacts/unread-count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success && result.count > 0) {
            const contactsLink = document.querySelector('[data-page="contacts"]');
            if (contactsLink) {
                const existingBadge = contactsLink.querySelector('.unread-badge');
                if (existingBadge) existingBadge.remove();
                
                const badge = document.createElement('span');
                badge.className = 'unread-badge';
                badge.textContent = result.count;
                contactsLink.appendChild(badge);
            }
        } else {
            const badge = document.querySelector('[data-page="contacts"] .unread-badge');
            if (badge) badge.remove();
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

// Load Charts
async function loadCharts() {
    try {
        // Registrations chart
        const regChartResponse = await fetch(`${API_URL}/charts/registrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const regChartResult = await regChartResponse.json();
        
        if (regChartResult.success && regChartResult.data.length > 0) {
            const months = regChartResult.data.map(item => {
                const [year, month] = item.month.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleString('id-ID', { month: 'short' });
            });
            const counts = regChartResult.data.map(item => item.total);
            
            const ctx1 = document.getElementById('registrationsChart').getContext('2d');
            new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Jumlah Pendaftaran',
                        data: counts,
                        borderColor: '#2E7D32',
                        backgroundColor: 'rgba(46,125,50,0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Package distribution chart
        const packageResponse = await fetch(`${API_URL}/charts/packages`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const packageResult = await packageResponse.json();
        
        if (packageResult.success && packageResult.data.length > 0) {
            const packages = packageResult.data.map(item => item.package);
            const counts = packageResult.data.map(item => item.total);
            
            const ctx2 = document.getElementById('packageChart').getContext('2d');
            new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: packages,
                    datasets: [{
                        data: counts,
                        backgroundColor: ['#4CAF50', '#FFC107', '#9C27B0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

// Load Members with DataTables
function loadMembers() {
    membersTable = $('#membersTable').DataTable({
        ajax: {
            url: `${API_URL}/members`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` },
            dataSrc: 'data'
        },
        columns: [
            { data: 'id' },
            { data: 'name' },
            { data: 'email' },
            { data: 'phone' },
            { data: 'package' },
            { 
                data: 'join_date',
                render: function(data) {
                    return new Date(data).toLocaleDateString('id-ID');
                }
            },
            {
                data: 'status',
                render: function(data) {
                    return `<span class="status-badge status-${data === 'active' ? 'active' : 'inactive'}">${data || 'Active'}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="action-buttons">
                            <button class="btn-action btn-delete" onclick="deleteMember(${data.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
}

// Load Registrations
function loadRegistrations() {
    registrationsTable = $('#registrationsTable').DataTable({
        ajax: {
            url: `${API_URL}/registrations`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` },
            dataSrc: 'data'
        },
        columns: [
            { data: 'id' },
            { 
                data: 'registration_date',
                render: function(data) {
                    return new Date(data).toLocaleDateString('id-ID');
                }
            },
            { data: 'name' },
            { data: 'email' },
            { data: 'phone' },
            { data: 'package' },
            {
                data: 'status',
                render: function(data) {
                    const statusClass = data === 'approved' ? 'active' : (data === 'rejected' ? 'inactive' : 'pending');
                    return `<span class="status-badge status-${statusClass}">${data || 'Pending'}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="action-buttons">
                            <button class="btn-action btn-view" onclick="viewRegistration(${data.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${data.status === 'pending' ? `
                                <button class="btn-action btn-edit" onclick="approveRegistration(${data.id})">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn-action btn-delete" onclick="rejectRegistration(${data.id})">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
}

// ==================== UPDATED BOOKINGS MANAGEMENT WITH WHATSAPP ====================

// Load Bookings with WhatsApp Integration
async function loadBookings() {
    try {
        // First, get members data for phone numbers
        const membersResponse = await fetch(`${API_URL}/members`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const membersResult = await membersResponse.json();
        const members = membersResult.success ? membersResult.data : [];
        
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            bookingDataList = result.data;
            
            // Enrich booking data with phone numbers from members
            bookingDataList = bookingDataList.map(booking => {
                const member = members.find(m => m.email === booking.user_email);
                return {
                    ...booking,
                    user_phone: member ? member.phone : '-'
                };
            });
            
            if (bookingsTable) {
                bookingsTable.destroy();
            }
            
            bookingsTable = $('#bookingsTable').DataTable({
                data: bookingDataList,
                columns: [
                    {
                        data: null,
                        render: function(data) {
                            return `<input type="checkbox" class="booking-checkbox" value="${data.id}" onchange="updateSelectedCount()">`;
                        },
                        orderable: false
                    },
                    { data: 'id' },
                    { 
                        data: 'booking_date',
                        render: function(data) {
                            return new Date(data).toLocaleString('id-ID');
                        }
                    },
                    { 
                        data: 'day',
                        render: function(data) {
                            return getDayNameIndonesian(data);
                        }
                    },
                    { data: 'time' },
                    { data: 'class_name' },
                    { data: 'instructor' },
                    { data: 'user_name' },
                    { data: 'user_email' },
                    { 
                        data: 'user_phone',
                        render: function(data) {
                            if (data && data !== '-') {
                                const formattedPhone = formatPhoneNumber(data);
                                return `<a href="https://wa.me/${formattedPhone}" target="_blank" class="text-success" title="Klik untuk chat via WhatsApp">
                                    <i class="fab fa-whatsapp"></i> ${data}
                                </a>`;
                            } 
                            return '<span class="text-muted">Tidak ada</span>';
                        }
                    },
                    {
                        data: 'status',
                        render: function(data) {
                            const statusClass = data === 'confirmed' ? 'confirmed' : (data === 'cancelled' ? 'cancelled' : 'pending');
                            const statusText = data === 'confirmed' ? 'Confirmed' : (data === 'cancelled' ? 'Cancelled' : 'Pending');
                            return `<span class="booking-status status-${statusClass}">${statusText}</span>`;
                        }
                    },
                    {
                        data: null,
                        render: function(data) {
                            return `
                                <div class="action-buttons">
                                    <button class="btn-action btn-view" onclick="viewBookingDetail(${data.id})" title="Lihat Detail">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-action btn-success" onclick="sendSingleWhatsAppMessage(${data.id})" style="background: #25D366;" title="Kirim WhatsApp">
                                        <i class="fab fa-whatsapp"></i>
                                    </button>
                                    ${data.status === 'confirmed' ? `
                                        <button class="btn-action btn-delete" onclick="cancelBooking(${data.id})" title="Batalkan Booking">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }
                    }
                ],
                order: [[1, 'desc']],
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
                },
                drawCallback: function() {
                    // Reset select all checkbox
                    const selectAll = document.getElementById('selectAllBookings');
                    if (selectAll) selectAll.checked = false;
                    selectedBookings = [];
                    
                    // Update broadcast button text
                    const btnText = document.querySelector('.btn-success');
                    if (btnText && btnText.innerHTML.includes('Broadcast')) {
                        btnText.innerHTML = `<i class="fab fa-whatsapp"></i> Broadcast WhatsApp`;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// View Booking Detail
window.viewBookingDetail = async function(id) {
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const booking = result.data.find(b => b.id === id);
            if (booking) {
                const dayNames = {
                    senin: 'Senin',
                    selasa: 'Selasa',
                    rabu: 'Rabu',
                    kamis: 'Kamis',
                    jumat: 'Jumat',
                    sabtu: 'Sabtu',
                    minggu: 'Minggu'
                };
                
                const modalContent = `
                    <div class="booking-detail">
                        <p><strong>ID Booking:</strong> ${booking.id}</p>
                        <p><strong>Tanggal Booking:</strong> ${new Date(booking.booking_date).toLocaleString('id-ID')}</p>
                        <hr>
                        <p><strong>Detail Kelas:</strong></p>
                        <ul>
                            <li><strong>Hari:</strong> ${dayNames[booking.day] || booking.day}</li>
                            <li><strong>Jam:</strong> ${booking.time}</li>
                            <li><strong>Kelas:</strong> ${booking.class_name}</li>
                            <li><strong>Instruktur:</strong> ${booking.instructor}</li>
                        </ul>
                        <hr>
                        <p><strong>Detail Member:</strong></p>
                        <ul>
                            <li><strong>Nama:</strong> ${booking.user_name}</li>
                            <li><strong>Email:</strong> ${booking.user_email}</li>
                            <li><strong>No. HP:</strong> ${booking.user_phone || '-'}</li>
                        </ul>
                        <hr>
                        <p><strong>Status:</strong> 
                            <span class="booking-status status-${booking.status === 'confirmed' ? 'confirmed' : 'cancelled'}">
                                ${booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                            </span>
                        </p>
                    </div>
                `;
                
                document.getElementById('bookingDetailContent').innerHTML = modalContent;
                const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
                modal.show();
            }
        }
    } catch (error) {
        console.error('Error viewing booking:', error);
        showNotification('Gagal memuat detail booking', 'error');
    }
};

// Cancel Booking
window.cancelBooking = async function(id) {
    if (confirm('Yakin ingin membatalkan booking ini?')) {
        try {
            const response = await fetch(`${API_URL}/bookings/${id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                bookingsTable.ajax.reload();
                loadDashboardData();
                showNotification('Booking berhasil dibatalkan', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            showNotification('Gagal membatalkan booking', 'error');
        }
    }
};

// Export Bookings to Excel
window.exportBookingsToExcel = function() {
    const table = document.getElementById('bookingsTable');
    const rows = table.querySelectorAll('tr');
    let csv = [];
    
    // Get headers
    const headers = [];
    const headerCells = rows[0].querySelectorAll('th');
    headerCells.forEach(cell => {
        headers.push(cell.innerText);
    });
    csv.push(headers.join(','));
    
    // Get data rows (skip first row which is header)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = row.querySelectorAll('td');
        const rowArray = [];
        rowData.forEach(cell => {
            let text = cell.innerText;
            // Remove any commas and quotes
            text = text.replace(/,/g, ';');
            text = text.replace(/"/g, '');
            rowArray.push(`"${text}"`);
        });
        csv.push(rowArray.join(','));
    }
    
    // Download CSV
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data berhasil diexport', 'success');
};

// Print Bookings
window.printBookings = function() {
    const printContent = document.getElementById('bookingsTable').cloneNode(true);
    const originalTitle = document.title;
    document.title = 'Laporan Booking Kelas - Rumah Yoga';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Laporan Booking Kelas - Rumah Yoga</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h2 { color: #2E7D32; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .date { text-align: right; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Rumah Yoga</h2>
                    <h3>Laporan Booking Kelas</h3>
                </div>
                <div class="date">
                    Tanggal: ${new Date().toLocaleDateString('id-ID')}
                </div>
                ${printContent.outerHTML}
                <div style="margin-top: 30px; text-align: center; font-size: 12px;">
                    © 2026 Rumah Yoga - Laporan resmi sistem
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    document.title = originalTitle;
};

// ==================== WHATSAPP INTEGRATION FUNCTIONS ====================

// Toggle select all checkboxes
window.toggleSelectAll = function() {
    const selectAll = document.getElementById('selectAllBookings');
    const checkboxes = document.querySelectorAll('.booking-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
};

// Update selected bookings count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.booking-checkbox:checked');
    selectedBookings = [];
    
    checkboxes.forEach(checkbox => {
        const bookingId = parseInt(checkbox.value);
        const booking = bookingDataList.find(b => b.id === bookingId);
        if (booking) {
            selectedBookings.push(booking);
        }
    });
    
    const count = selectedBookings.length;
    const broadcastBtn = document.querySelector('.btn-success');
    if (broadcastBtn && count > 0) {
        broadcastBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Broadcast WhatsApp (${count})`;
    } else if (broadcastBtn && broadcastBtn.innerHTML.includes('Broadcast')) {
        broadcastBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Broadcast WhatsApp`;
    }
    
    // Update recipient count in modal if open
    const recipientCountSpan = document.getElementById('recipientCount');
    if (recipientCountSpan) {
        recipientCountSpan.textContent = count;
    }
}

// Send bulk WhatsApp messages
window.sendBulkWhatsApp = function() {
    if (selectedBookings.length === 0) {
        showNotification('Pilih minimal satu booking untuk dikirim pesan!', 'error');
        return;
    }
    
    // Update recipient count
    document.getElementById('recipientCount').textContent = selectedBookings.length;
    
    // Display selected recipients
    const recipientsDiv = document.getElementById('selectedRecipients');
    let recipientsHtml = '<div class="list-group">';
    selectedBookings.forEach(booking => {
        const phoneDisplay = booking.user_phone && booking.user_phone !== '-' ? booking.user_phone : 'Tidak ada nomor';
        recipientsHtml += `
            <div class="list-group-item">
                <i class="fas fa-user"></i> <strong>${booking.user_name}</strong>
                <br><small><i class="fab fa-whatsapp text-success"></i> ${phoneDisplay}</small>
                <br><small class="text-muted">📅 ${getDayNameIndonesian(booking.day)} ${booking.time} - ${booking.class_name}</small>
            </div>
        `;
    });
    recipientsHtml += '</div>';
    recipientsDiv.innerHTML = recipientsHtml;
    
    // Set default message template
    const defaultMessage = `Halo {name},\n\nKami ingin mengingatkan jadwal kelas Anda:\n\n📅 Hari: {day}\n⏰ Jam: {time}\n🧘 Kelas: {class}\n👨‍🏫 Instruktur: {instructor}\n\nTerima kasih telah berlatih di Rumah Yoga! 🙏\n\n- Rumah Yoga Team -`;
    document.getElementById('whatsappMessage').value = defaultMessage;
    
    // Reset template selector
    document.getElementById('messageTemplate').value = '';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    modal.show();
};

// Apply message template
window.applyTemplate = function() {
    const template = document.getElementById('messageTemplate').value;
    let message = '';
    
    switch(template) {
        case 'reminder':
            message = `Halo {name},\n\nIni adalah pengingat ramah untuk kelas Anda besok:\n\n📅 Hari: {day}\n⏰ Jam: {time}\n🧘 Kelas: {class}\n👨‍🏫 Instruktur: {instructor}\n\nMohon datang 10 menit sebelum kelas dimulai. Jangan lupa membawa matras dan air minum!\n\nTerima kasih,\nRumah Yoga Team 🙏`;
            break;
        case 'cancellation':
            message = `Halo {name},\n\nDengan berat hati kami informasikan bahwa kelas {class} pada hari {day} jam {time} dibatalkan.\n\nKami mohon maaf atas ketidaknyamanan ini. Silakan hubungi kami untuk menjadwal ulang kelas Anda.\n\nTerima kasih,\nRumah Yoga Team`;
            break;
        case 'reschedule':
            message = `Halo {name},\n\nAda perubahan jadwal untuk kelas {class}.\n\nJadwal baru: {day}, jam {time}\nInstruktur: {instructor}\n\nMohon konfirmasi kehadiran Anda. Terima kasih.\n\n- Rumah Yoga Team -`;
            break;
        case 'confirmation':
            message = `Halo {name},\n\nBooking kelas Anda telah dikonfirmasi!\n\nDetail booking:\n📅 Hari: {day}\n⏰ Jam: {time}\n🧘 Kelas: {class}\n👨‍🏫 Instruktur: {instructor}\n\nSampai jumpa di Rumah Yoga! 🧘‍♀️✨\n\n- Rumah Yoga Team -`;
            break;
        case 'custom':
            message = '';
            break;
        default:
            return;
    }
    
    if (message) {
        document.getElementById('whatsappMessage').value = message;
    }
};

// Send WhatsApp messages to selected recipients
window.sendWhatsAppMessages = async function() {
    const messageTemplate = document.getElementById('whatsappMessage').value;
    
    if (!messageTemplate.trim()) {
        showNotification('Pesan tidak boleh kosong!', 'error');
        return;
    }
    
    const totalRecipients = selectedBookings.length;
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    showNotification(`Mempersiapkan pengiriman ke ${totalRecipients} penerima...`, 'info');
    
    for (const booking of selectedBookings) {
        // Get phone number
        let phoneNumber = booking.user_phone && booking.user_phone !== '-' ? booking.user_phone : await getUserPhone(booking.user_email);
        
        if (!phoneNumber || phoneNumber === '-') {
            console.warn(`No phone number for ${booking.user_name}`);
            failedCount++;
            continue;
        }
        
        // Format phone number
        phoneNumber = formatPhoneNumber(phoneNumber);
        
        if (!phoneNumber || phoneNumber.length < 10) {
            console.warn(`Invalid phone number for ${booking.user_name}: ${phoneNumber}`);
            skippedCount++;
            continue;
        }
        
        // Replace variables in message
        let personalizedMessage = messageTemplate
            .replace(/{name}/g, booking.user_name)
            .replace(/{class}/g, booking.class_name)
            .replace(/{date}/g, new Date(booking.booking_date).toLocaleDateString('id-ID'))
            .replace(/{time}/g, booking.time)
            .replace(/{instructor}/g, booking.instructor)
            .replace(/{day}/g, getDayNameIndonesian(booking.day));
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(personalizedMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        // Open WhatsApp in new tab with delay between opens
        setTimeout(() => {
            window.open(whatsappUrl, '_blank');
        }, sentCount * 1500);
        
        sentCount++;
        
        // Log to console for tracking
        console.log(`[${sentCount}/${totalRecipients}] WhatsApp message prepared for ${booking.user_name} (${phoneNumber})`);
    }
    
    setTimeout(() => {
        let message = `Pesan dipersiapkan untuk ${sentCount} penerima.`;
        if (failedCount > 0) message += ` ${failedCount} gagal (no phone number).`;
        if (skippedCount > 0) message += ` ${skippedCount} nomor tidak valid.`;
        showNotification(message, sentCount > 0 ? 'success' : 'error');
    }, 3000);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
    if (modal) modal.hide();
    
    // Reset selection
    const selectAll = document.getElementById('selectAllBookings');
    if (selectAll) selectAll.checked = false;
    updateSelectedCount();
};

// Send single WhatsApp message
window.sendSingleWhatsAppMessage = async function(bookingId) {
    const booking = bookingDataList.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Get phone number
    let phoneNumber = booking.user_phone && booking.user_phone !== '-' ? booking.user_phone : await getUserPhone(booking.user_email);
    
    if (!phoneNumber || phoneNumber === '-') {
        showNotification('Nomor WhatsApp tidak ditemukan untuk member ini!', 'error');
        return;
    }
    
    // Format phone number
    phoneNumber = formatPhoneNumber(phoneNumber);
    
    if (!phoneNumber || phoneNumber.length < 10) {
        showNotification('Nomor WhatsApp tidak valid!', 'error');
        return;
    }
    
    // Set modal fields
    document.getElementById('singleWhatsappNumber').value = phoneNumber;
    document.getElementById('singleWhatsappName').value = booking.user_name;
    
    // Set booking detail
    const bookingDetail = `
        <strong>Kelas:</strong> ${booking.class_name}<br>
        <strong>Hari:</strong> ${getDayNameIndonesian(booking.day)}<br>
        <strong>Jam:</strong> ${booking.time}<br>
        <strong>Instruktur:</strong> ${booking.instructor}
    `;
    document.getElementById('singleBookingDetail').innerHTML = bookingDetail;
    
    // Set default message
    const defaultMessage = `Halo ${booking.user_name},\n\nBooking kelas Anda:\n📅 ${getDayNameIndonesian(booking.day)}\n⏰ ${booking.time}\n🧘 ${booking.class_name}\n👨‍🏫 Instruktur: ${booking.instructor}\n\nTelah dikonfirmasi. Sampai jumpa di Rumah Yoga! 🙏`;
    document.getElementById('singleWhatsappMessage').value = defaultMessage;
    
    // Store current booking for sending
    window.currentWhatsAppBooking = booking;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('singleWhatsappModal'));
    modal.show();
};

// Send single WhatsApp message
window.sendSingleWhatsApp = function() {
    const booking = window.currentWhatsAppBooking;
    const message = document.getElementById('singleWhatsappMessage').value;
    const phoneNumber = document.getElementById('singleWhatsappNumber').value;
    
    if (!message.trim()) {
        showNotification('Pesan tidak boleh kosong!', 'error');
        return;
    }
    
    if (!phoneNumber) {
        showNotification('Nomor WhatsApp tidak valid!', 'error');
        return;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('singleWhatsappModal'));
    if (modal) modal.hide();
    
    showNotification('Membuka WhatsApp...', 'success');
};

// Format phone number for WhatsApp
function formatPhoneNumber(phone) {
    if (!phone || phone === '-') return null;
    
    // Remove spaces, dashes, and other special characters
    let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\./g, '');
    
    // Remove leading 0 and add country code 62 for Indonesia
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    
    // If starts with +62, remove the + 
    if (cleaned.startsWith('+62')) {
        cleaned = '62' + cleaned.substring(3);
    }
    
    // Ensure it starts with 62 and has valid length
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    
    // Validate length (Indonesian numbers should be around 10-13 digits after 62)
    if (cleaned.length < 10 || cleaned.length > 15) {
        console.warn(`Suspicious phone number length: ${cleaned}`);
    }
    
    return cleaned;
}

// Get user phone number from database
async function getUserPhone(email) {
    try {
        // Try to get from members table
        const response = await fetch(`${API_URL}/members`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const member = result.data.find(m => m.email === email);
            if (member && member.phone && member.phone !== '-') {
                return member.phone;
            }
        }
        
        // Try to get from registrations
        const regResponse = await fetch(`${API_URL}/registrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const regResult = await regResponse.json();
        
        if (regResult.success) {
            const registration = regResult.data.find(r => r.email === email);
            if (registration && registration.phone && registration.phone !== '-') {
                return registration.phone;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting user phone:', error);
        return null;
    }
}

// Get day name in Indonesian
function getDayNameIndonesian(day) {
    const dayNames = {
        senin: 'Senin',
        selasa: 'Selasa',
        rabu: 'Rabu',
        kamis: 'Kamis',
        jumat: 'Jumat',
        sabtu: 'Sabtu',
        minggu: 'Minggu'
    };
    return dayNames[day] || day;
}

// ==================== CONTACTS MANAGEMENT ====================

// Load Contacts with Reply Button
function loadContacts() {
    contactsTable = $('#contactsTable').DataTable({
        ajax: {
            url: `${API_URL}/contacts`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` },
            dataSrc: 'data'
        },
        columns: [
            { data: 'id' },
            { 
                data: 'contact_date',
                render: function(data) {
                    return new Date(data).toLocaleDateString('id-ID');
                }
            },
            { data: 'name' },
            { data: 'email' },
            { data: 'phone' },
            { 
                data: 'message',
                render: function(data) {
                    return data.length > 50 ? data.substring(0, 50) + '...' : data;
                }
            },
            {
                data: 'is_read',
                render: function(data) {
                    return `<span class="status-badge ${data ? 'status-active' : 'status-pending'}">${data ? 'Sudah Dibaca' : 'Belum Dibaca'}</span>`;
                }
            },
            {
                data: 'is_replied',
                render: function(data) {
                    return `<span class="status-badge ${data ? 'status-active' : 'status-pending'}">${data ? 'Sudah Dibalas' : 'Belum Dibalas'}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    const phoneFormatted = data.phone ? formatPhoneNumber(data.phone) : '';
                    const whatsappLink = phoneFormatted ? `https://wa.me/${phoneFormatted}?text=Halo%20${encodeURIComponent(data.name)}%2C%20saya%20dari%20Rumah%20Yoga...` : '#';
                    return `
                        <div class="action-buttons">
                            <button class="btn-action btn-view" onclick="viewContact(${data.id}, ${data.is_read})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <a href="${whatsappLink}" target="_blank" class="btn-action" style="background: #25D366; color: white; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                            <button class="btn-action btn-reply" onclick="replyToContact(${data.id}, '${data.name.replace(/'/g, "\\'")}', '${data.email}', '${data.message.replace(/'/g, "\\'")}')">
                                <i class="fas fa-reply"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteContact(${data.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        },
        drawCallback: function() {
            loadUnreadCount();
        }
    });
}

// Reply to contact function
window.replyToContact = async function(id, name, email, message) {
    document.getElementById('replyContactId').value = id;
    document.getElementById('replyUserEmail').value = email;
    document.getElementById('replyUserName').value = name;
    
    const originalMessageDiv = document.getElementById('originalMessage');
    originalMessageDiv.innerHTML = `
        <div class="message-box">
            <strong>Dari: ${name}</strong><br>
            <strong>Email: ${email}</strong><br>
            <strong>Tanggal: ${new Date().toLocaleString()}</strong>
            <hr>
            <p>${message}</p>
        </div>
    `;
    
    await loadReplyHistory(id);
    
    document.getElementById('replyMessage').value = '';
    document.getElementById('sendEmailCopy').checked = true;
    
    const replyModal = new bootstrap.Modal(document.getElementById('replyModal'));
    replyModal.show();
    
    try {
        await fetch(`${API_URL}/contacts/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        contactsTable.ajax.reload();
        loadUnreadCount();
    } catch (error) {
        console.error('Error marking as read:', error);
    }
};

// Load reply history
async function loadReplyHistory(contactId) {
    try {
        const response = await fetch(`${API_URL}/contacts/${contactId}/replies`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        const historyContainer = document.getElementById('replyHistory');
        
        if (result.success && result.data.length > 0) {
            let html = '<div class="reply-list">';
            result.data.forEach(reply => {
                const replyDate = new Date(reply.reply_date).toLocaleString('id-ID');
                html += `
                    <div class="reply-item admin">
                        <div class="reply-header">
                            <strong><i class="fas fa-user-shield"></i> ${reply.admin_name} (Admin)</strong>
                            <span>${replyDate}</span>
                        </div>
                        <p class="reply-message">${escapeHtml(reply.reply_message)}</p>
                    </div>
                `;
            });
            html += '</div>';
            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = '<p class="text-muted">Belum ada balasan sebelumnya.</p>';
        }
    } catch (error) {
        console.error('Error loading reply history:', error);
        document.getElementById('replyHistory').innerHTML = '<p class="text-danger">Gagal memuat riwayat balasan</p>';
    }
}

// Submit reply form
document.getElementById('replyForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const contactId = document.getElementById('replyContactId').value;
    const replyMessage = document.getElementById('replyMessage').value;
    const userEmail = document.getElementById('replyUserEmail').value;
    const userName = document.getElementById('replyUserName').value;
    const sendEmailCopy = document.getElementById('sendEmailCopy').checked;
    
    if (!replyMessage.trim()) {
        showNotification('Pesan balasan tidak boleh kosong!', 'error');
        return;
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/contacts/${contactId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                reply_message: replyMessage,
                user_email: userEmail,
                user_name: userName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (sendEmailCopy) {
                await fetch(`${API_URL}/contacts/${contactId}/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        reply_message: replyMessage,
                        user_email: userEmail,
                        user_name: userName
                    })
                });
            }
            
            showNotification('Balasan berhasil dikirim!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
            contactsTable.ajax.reload();
            loadUnreadCount();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error sending reply:', error);
        showNotification(error.message || 'Gagal mengirim balasan', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// View contact
window.viewContact = async function(id, isRead) {
    try {
        if (!isRead) {
            await fetch(`${API_URL}/contacts/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            contactsTable.ajax.reload();
            loadUnreadCount();
        }
        
        const response = await fetch(`${API_URL}/contacts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const contact = result.data.find(c => c.id === id);
            if (contact) {
                alert(`Pesan dari ${contact.name}\nEmail: ${contact.email}\nTelepon: ${contact.phone}\n\nPesan:\n${contact.message}`);
            }
        }
    } catch (error) {
        console.error('Error viewing contact:', error);
    }
};

// Delete contact
window.deleteContact = async function(id) {
    if (confirm('Yakin ingin menghapus pesan ini?')) {
        try {
            const response = await fetch(`${API_URL}/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                contactsTable.ajax.reload();
                loadDashboardData();
                loadUnreadCount();
                showNotification('Pesan berhasil dihapus', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            showNotification('Gagal menghapus pesan', 'error');
        }
    }
};

// ==================== CLASSES MANAGEMENT ====================

// Load Classes
function loadClasses() {
    classesTable = $('#classesTable').DataTable({
        ajax: {
            url: `${API_URL}/classes`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` },
            dataSrc: 'data'
        },
        columns: [
            { data: 'id' },
            { data: 'name' },
            { data: 'instructor' },
            { data: 'schedule' },
            { data: 'capacity' },
            {
                data: 'status',
                render: function(data) {
                    return `<span class="status-badge status-${data === 'active' ? 'active' : 'inactive'}">${data || 'Active'}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="action-buttons">
                            <button class="btn-action btn-delete" onclick="deleteClass(${data.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
}

// Delete class
window.deleteClass = async function(id) {
    if (confirm('Yakin ingin menghapus kelas ini?')) {
        try {
            const response = await fetch(`${API_URL}/classes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                classesTable.ajax.reload();
                showNotification('Kelas berhasil dihapus', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting class:', error);
            showNotification('Gagal menghapus kelas', 'error');
        }
    }
};

// Add Class
document.getElementById('addClassForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('className').value,
        instructor: document.getElementById('classInstructor').value,
        schedule: document.getElementById('classSchedule').value,
        capacity: parseInt(document.getElementById('classCapacity').value)
    };
    
    try {
        const response = await fetch(`${API_URL}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('addClassModal')).hide();
            classesTable.ajax.reload();
            showNotification('Kelas berhasil ditambahkan', 'success');
            this.reset();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error adding class:', error);
        showNotification('Gagal menambah kelas', 'error');
    }
});

// ==================== MEMBERS MANAGEMENT ====================

// Add Member
document.getElementById('addMemberForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('memberName').value,
        email: document.getElementById('memberEmail').value,
        phone: document.getElementById('memberPhone').value,
        package: document.getElementById('memberPackage').value
    };
    
    try {
        const response = await fetch(`${API_URL}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
            membersTable.ajax.reload();
            loadDashboardData();
            showNotification('Member berhasil ditambahkan', 'success');
            this.reset();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        showNotification('Gagal menambah member', 'error');
    }
});

// Delete Member
window.deleteMember = async function(id) {
    if (confirm('Yakin ingin menghapus member ini?')) {
        try {
            const response = await fetch(`${API_URL}/members/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                membersTable.ajax.reload();
                loadDashboardData();
                showNotification('Member berhasil dihapus', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            showNotification('Gagal menghapus member', 'error');
        }
    }
};

// Approve Registration
window.approveRegistration = async function(id) {
    if (confirm('Setujui pendaftaran ini?')) {
        try {
            const response = await fetch(`${API_URL}/registrations/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                registrationsTable.ajax.reload();
                membersTable.ajax.reload();
                loadDashboardData();
                showNotification('Pendaftaran disetujui', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error approving registration:', error);
            showNotification('Gagal menyetujui pendaftaran', 'error');
        }
    }
};

// Reject Registration
window.rejectRegistration = async function(id) {
    if (confirm('Yakin ingin menolak pendaftaran ini?')) {
        try {
            const response = await fetch(`${API_URL}/registrations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                registrationsTable.ajax.reload();
                loadDashboardData();
                showNotification('Pendaftaran ditolak', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error rejecting registration:', error);
            showNotification('Gagal menolak pendaftaran', 'error');
        }
    }
};

// View Registration
window.viewRegistration = async function(id) {
    try {
        const response = await fetch(`${API_URL}/registrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const registration = result.data.find(r => r.id === id);
            if (registration) {
                alert(`Detail Pendaftaran\n\nNama: ${registration.name}\nEmail: ${registration.email}\nTelepon: ${registration.phone}\nPaket: ${registration.package}\nTanggal: ${new Date(registration.registration_date).toLocaleDateString('id-ID')}\nStatus: ${registration.status || 'Pending'}`);
            }
        }
    } catch (error) {
        console.error('Error viewing registration:', error);
        alert('Gagal memuat detail pendaftaran');
    }
};

// Change Password
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('Password baru tidak cocok!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password minimal 6 karakter!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Password berhasil diubah!', 'success');
            this.reset();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Gagal mengubah password', 'error');
    }
});

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show Notification
function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `custom-notification alert alert-${type === 'success' ? 'success' : (type === 'error' ? 'danger' : 'info')}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.animation = 'slideIn 0.3s ease';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .btn-reply {
        background: #17a2b8;
        color: white;
    }
    
    .btn-reply:hover {
        background: #138496;
        color: white;
    }
    
    .btn-action.btn-success {
        background: #25D366;
        color: white;
    }
    
    .btn-action.btn-success:hover {
        background: #128C7E;
    }
    
    .custom-notification {
        border-radius: 8px;
        padding: 12px 20px;
    }
`;
document.head.appendChild(style);