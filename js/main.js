// API Base URL
const API_URL = 'http://localhost:3000/api';

// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll to section function
window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
};

// Navbar Scroll Effect
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('mainNav');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Back to Top Button
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', function() {
    if (window.scrollY > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
});

backToTop.addEventListener('click', function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Submit Contact Form with API
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            message: document.getElementById('message').value
        };
        
        // Save user email to localStorage for future reply checking
        if (formData.email) {
            localStorage.setItem('userEmail', formData.email);
            localStorage.setItem('userName', formData.name);
        }
        
        // Validate form data
        if (!formData.name || !formData.email || !formData.phone || !formData.message) {
            formMessage.style.display = 'block';
            formMessage.className = 'alert alert-danger mt-3';
            formMessage.innerHTML = 'Semua field harus diisi!';
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 3000);
            return;
        }
        
        // Show loading state
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        submitBtn.disabled = true;
        
        try {
            // Kirim ke backend API
            const response = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Success message
                formMessage.style.display = 'block';
                formMessage.className = 'alert alert-success mt-3';
                formMessage.innerHTML = 'Pesan Anda telah terkirim! Kami akan menghubungi Anda segera.';
                
                // Reset form
                contactForm.reset();
                
                // Reset validation styles
                document.querySelectorAll('#contactForm input, #contactForm textarea').forEach(input => {
                    input.style.borderColor = '#e0e0e0';
                });
                
                // Start checking for replies after 5 seconds
                setTimeout(() => {
                    checkForReplies(formData.email);
                }, 5000);
            } else {
                throw new Error(result.message || 'Gagal mengirim pesan');
            }
        } catch (error) {
            console.error('Error:', error);
            formMessage.style.display = 'block';
            formMessage.className = 'alert alert-danger mt-3';
            formMessage.innerHTML = error.message || 'Maaf, terjadi kesalahan. Silakan coba lagi.';
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Hide message after 5 seconds
            setTimeout(() => {
                if (formMessage) formMessage.style.display = 'none';
            }, 5000);
        }
    });
}

// Membership Modal
let membershipModal;
document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('membershipModal');
    if (modalElement) {
        membershipModal = new bootstrap.Modal(modalElement);
    }
    
    // Check for replies on page load if user email exists
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        setTimeout(() => {
            checkForReplies(savedEmail);
        }, 3000);
    }
    
    // Start periodic reply checking every 2 minutes
    startPeriodicReplyCheck();
    
    // Initialize schedule
    initSchedule();
});

window.showMembershipForm = function(packageName) {
    document.getElementById('selectedPackage').value = packageName;
    const modalTitle = document.querySelector('#membershipModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `Daftar Membership ${packageName}`;
    }
    if (membershipModal) {
        membershipModal.show();
    }
};

// Membership Form Handler with API
const membershipForm = document.getElementById('membershipForm');
if (membershipForm) {
    membershipForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            package: document.getElementById('selectedPackage').value,
            name: document.getElementById('memberName').value,
            email: document.getElementById('memberEmail').value,
            phone: document.getElementById('memberPhone').value
        };
        
        // Save user email to localStorage
        if (formData.email) {
            localStorage.setItem('userEmail', formData.email);
            localStorage.setItem('userName', formData.name);
        }
        
        // Validate form data
        if (!formData.name || !formData.email || !formData.phone) {
            showNotification('Semua field harus diisi!', 'error');
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showNotification('Format email tidak valid!', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = membershipForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        submitBtn.disabled = true;
        
        try {
            // Kirim ke backend API
            const response = await fetch(`${API_URL}/membership/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                if (membershipModal) membershipModal.hide();
                
                // Show success message
                showNotification(`Terima kasih ${formData.name}! Pendaftaran membership ${formData.package} berhasil. Kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi.`, 'success');
                
                // Reset form
                membershipForm.reset();
            } else {
                throw new Error(result.message || 'Gagal mendaftar');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Maaf, terjadi kesalahan. Silakan coba lagi.', 'error');
        } finally {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==================== SCHEDULE MANAGEMENT ====================

// Schedule Data based on the image
const scheduleData = {
    senin: [
        { time: "08:15 – 09:15", className: "BOOKED CLASS", instructor: "JULIE", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "17:30 – 18:30", className: "BALOK YOGA (PROPS)", instructor: "JULIE", status: "available", capacity: 15 },
        { time: "19:00 – 20:00", className: "BACKBEND YOGA", instructor: "JULIE", status: "available", capacity: 12 },
        { time: "19:00 – 20:00", className: "WHEEL YOGA – VISIT CLASS", instructor: "NANIK", status: "available", capacity: 10, note: "Kelas Visit" }
    ],
    selasa: [
        { time: "08:15 – 09:15", className: "BOOKED CLASS", instructor: "NANIK", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "17:30 – 18:30", className: "POWER YOGA (1) Not For Newbie", instructor: "NANIK", status: "available", capacity: 12, note: "Level Intermediate" },
        { time: "19:00 – 20:00", className: "CREATIVE YOGA", instructor: "JULIE", status: "available", capacity: 15 }
    ],
    rabu: [
        { time: "07:00 – 08:00", className: "BASIC YOGA (BEGINNER FRIENDLY)", instructor: "NANIK", status: "available", capacity: 20, note: "Untuk Pemula" },
        { time: "17:00 – 18:00", className: "HATHA FLOW", instructor: "TEDDY", status: "available", capacity: 15 },
        { time: "19:00 – 20:00", className: "MIX YOGA", instructor: "TRIYANA", status: "available", capacity: 12 }
    ],
    kamis: [
        { time: "08:15 – 09:15", className: "BOOKED CLASS", instructor: "EMIL", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "17:00 – 18:00", className: "POWER YOGA", instructor: "EMIL", status: "available", capacity: 12 },
        { time: "18:30 – 19:30", className: "ACRO YOGA", instructor: "EMIL", status: "available", capacity: 10, note: "Partner Required" }
    ],
    jumat: [
        { time: "08:15 – 09:15", className: "BOOKED CLASS", instructor: "ELISH", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "17:30 – 18:30", className: "VINYASA FLOW", instructor: "ELISH", status: "available", capacity: 15 },
        { time: "19:00 – 20:00", className: "MIX YOGA", instructor: "ELISH", status: "available", capacity: 12 },
        { time: "19:00 – 20:00", className: "WHEEL YOGA (LIMITED SEAT)", instructor: "NANIK", status: "limited", capacity: 5, note: "Limited Seat - Hanya 5 peserta" }
    ],
    sabtu: [
        { time: "08:30 – 09:30", className: "BOOKED CLASS", instructor: "-", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "10:00 – 11:00", className: "BOOKED CLASS", instructor: "-", status: "booked", note: "Kelas Privat", capacity: 0 }
    ],
    minggu: [
        { time: "08:30 – 09:30", className: "BOOKED CLASS", instructor: "NANIK", status: "booked", note: "Kelas Privat", capacity: 0 },
        { time: "10:00 – 11:00", className: "VARIANT YOGA", instructor: "-", status: "available", capacity: 15, note: "Variasi Yoga Setiap Minggu" }
    ]
};

// Store booked classes in localStorage
let bookedClasses = JSON.parse(localStorage.getItem('bookedClasses') || '[]');

// Initialize schedule when page loads
function initSchedule() {
    // Create schedule tabs if they exist
    const tabs = document.querySelectorAll('.schedule-tab');
    if (tabs.length > 0) {
        // Add click event to tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const day = this.getAttribute('data-day');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Load schedule for selected day
                loadSchedule(day);
            });
        });
        
        // Load initial schedule (Monday)
        loadSchedule('senin');
    }
}

function loadSchedule(day) {
    const scheduleContainer = document.getElementById('scheduleTable');
    if (!scheduleContainer) return;
    
    const classes = scheduleData[day];
    const dayNames = {
        senin: 'Senin',
        selasa: 'Selasa',
        rabu: 'Rabu',
        kamis: 'Kamis',
        jumat: 'Jumat',
        sabtu: 'Sabtu',
        minggu: 'Minggu'
    };
    
    if (!classes || classes.length === 0) {
        scheduleContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <p>Tidak ada kelas pada hari ${dayNames[day]}</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="schedule-table">
            <thead>
                <tr>
                    <th>Jam</th>
                    <th>Kelas</th>
                    <th>Instruktur</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    classes.forEach((classItem, index) => {
        const isBooked = classItem.status === 'booked';
        const isLimited = classItem.status === 'limited';
        const isUserBooked = bookedClasses.some(b => b.day === day && b.time === classItem.time && b.userEmail === localStorage.getItem('userEmail'));
        const availableSeats = classItem.capacity - bookedClasses.filter(b => b.day === day && b.time === classItem.time).length;
        
        let statusClass = '';
        let statusText = '';
        let statusNote = '';
        
        if (isBooked) {
            statusClass = 'status-booked';
            statusText = 'BOOKED';
            statusNote = classItem.note || 'Kelas Privat';
        } else if (isLimited) {
            statusClass = 'status-limited';
            statusText = `Limited (${Math.max(0, availableSeats)} seats left)`;
            statusNote = classItem.note || '';
        } else {
            statusClass = 'status-available';
            statusText = `Available (${Math.max(0, availableSeats)}/${classItem.capacity})`;
            statusNote = classItem.note || '';
        }
        
        const canBook = !isBooked && !isUserBooked && availableSeats > 0;
        const buttonText = isUserBooked ? 'Booked' : (isBooked ? 'Full' : 'Book Class');
        
        html += `
            <tr>
                <td class="class-time">${classItem.time}</td>
                <td class="class-name">
                    ${classItem.className}
                    ${statusNote ? `<br><small class="text-muted">${statusNote}</small>` : ''}
                </td>
                <td class="class-instructor">${classItem.instructor}</td>
                <td><span class="class-status ${statusClass}">${statusText}</span></td>
                <td>
                    ${!isBooked ? `
                        <button class="btn-book-class" 
                                onclick="bookClass('${day}', '${classItem.time}', '${classItem.className.replace(/'/g, "\\'")}', '${classItem.instructor}')"
                                ${!canBook ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    ` : '<span class="text-muted">-</span>'}
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    scheduleContainer.innerHTML = html;
    scheduleContainer.classList.add('active');
}

// Book Class Function
window.bookClass = async function(day, time, className, instructor) {
    // Check if user is logged in (has email in localStorage)
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    
    if (!userEmail) {
        showNotification('Silakan isi form kontak atau daftar membership terlebih dahulu untuk booking kelas!', 'error');
        // Scroll to contact form
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    // Check if already booked
    const alreadyBooked = bookedClasses.some(b => b.day === day && b.time === time && b.userEmail === userEmail);
    if (alreadyBooked) {
        showNotification('Anda sudah booking kelas ini!', 'error');
        return;
    }
    
    // Check available seats
    const classData = scheduleData[day].find(c => c.time === time);
    if (classData && classData.capacity > 0) {
        const bookedCount = bookedClasses.filter(b => b.day === day && b.time === time).length;
        if (bookedCount >= classData.capacity) {
            showNotification('Maaf, kelas sudah penuh!', 'error');
            return;
        }
    }
    
    // Show confirmation dialog
    const confirmBook = confirm(`Booking kelas:\n\nHari: ${getDayName(day)}\nJam: ${time}\nKelas: ${className}\nInstruktur: ${instructor}\n\nLanjutkan booking?`);
    
    if (confirmBook) {
        // Save booking
        const booking = {
            id: Date.now(),
            day: day,
            time: time,
            className: className,
            instructor: instructor,
            userEmail: userEmail,
            userName: userName,
            bookingDate: new Date().toISOString(),
            status: 'confirmed'
        };
        
        bookedClasses.push(booking);
        localStorage.setItem('bookedClasses', JSON.stringify(bookedClasses));
        
        // Send booking data to backend
        try {
            const response = await fetch(`${API_URL}/booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(booking)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(`Berhasil booking kelas ${className}!`, 'success');
            } else {
                console.warn('Backend save failed but saved locally');
                showNotification(`Berhasil booking kelas ${className}! (Disimpan secara lokal)`, 'success');
            }
        } catch (error) {
            console.error('Error booking class:', error);
            showNotification(`Berhasil booking kelas ${className}! (Disimpan secara lokal)`, 'success');
        }
        
        // Reload schedule to update button state
        const activeTab = document.querySelector('.schedule-tab.active');
        if (activeTab) {
            const currentDay = activeTab.getAttribute('data-day');
            loadSchedule(currentDay);
        }
    }
};

// Helper function to get day name in Indonesian
function getDayName(day) {
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

// View My Bookings Function
window.viewMyBookings = function() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        showNotification('Silakan isi form kontak atau daftar membership terlebih dahulu untuk melihat booking Anda', 'error');
        return;
    }
    
    const myBookings = bookedClasses.filter(b => b.userEmail === userEmail);
    
    if (myBookings.length === 0) {
        showNotification('Anda belum memiliki booking kelas', 'info');
        return;
    }
    
    let message = '📋 Daftar Booking Kelas Anda:\n\n';
    myBookings.forEach((booking, index) => {
        message += `${index + 1}. ${getDayName(booking.day)} - ${booking.time}\n`;
        message += `   Kelas: ${booking.className}\n`;
        message += `   Instruktur: ${booking.instructor}\n`;
        message += `   Tanggal Booking: ${new Date(booking.bookingDate).toLocaleDateString('id-ID')}\n`;
        message += `   Status: ${booking.status}\n\n`;
    });
    
    alert(message);
};

// Add booking button to navbar
function addBookingNavButton() {
    const navbarNav = document.querySelector('.navbar-nav');
    if (navbarNav && !document.querySelector('.booking-nav-btn')) {
        const bookingLi = document.createElement('li');
        bookingLi.className = 'nav-item';
        bookingLi.innerHTML = `
            <a class="nav-link booking-nav-btn" href="#" onclick="viewMyBookings(); return false;">
                <i class="fas fa-calendar-check"></i> Booking Saya
            </a>
        `;
        navbarNav.appendChild(bookingLi);
    }
}

// Call this after DOM is loaded
setTimeout(addBookingNavButton, 1000);

// ==================== CHECK FOR REPLIES FROM ADMIN ====================

// Function to check for replies from admin
async function checkForReplies(userEmail) {
    if (!userEmail) {
        // Try to get email from localStorage
        userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;
    }
    
    try {
        // First, get all contacts to find replies for this user
        const response = await fetch(`${API_URL}/contacts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Find contacts from this user
            const userContacts = result.data.filter(contact => 
                contact.email === userEmail && contact.is_replied === 1
            );
            
            if (userContacts.length > 0) {
                // Check each contact for new replies that user hasn't seen
                let hasNewReplies = false;
                let totalNewReplies = 0;
                
                for (const contact of userContacts) {
                    // Get replies for this contact
                    const repliesResponse = await fetch(`${API_URL}/contacts/${contact.id}/replies`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const repliesResult = await repliesResponse.json();
                    
                    if (repliesResult.success && repliesResult.data) {
                        // Check for new replies (assuming we track last checked time)
                        const lastChecked = localStorage.getItem(`lastChecked_${contact.id}`) || 
                                           localStorage.getItem('lastReplyCheck') || 
                                           new Date(0).toISOString();
                        
                        const newReplies = repliesResult.data.filter(reply => 
                            new Date(reply.reply_date) > new Date(lastChecked)
                        );
                        
                        if (newReplies.length > 0) {
                            hasNewReplies = true;
                            totalNewReplies += newReplies.length;
                            
                            // Store that user has seen these replies
                            localStorage.setItem(`lastChecked_${contact.id}`, new Date().toISOString());
                            
                            // Show notification for each new reply
                            for (const reply of newReplies) {
                                showReplyNotification(contact, reply);
                            }
                        }
                    }
                }
                
                // Update last check time
                localStorage.setItem('lastReplyCheck', new Date().toISOString());
                
                if (hasNewReplies) {
                    // Also show a badge in the navbar or somewhere
                    showReplyBadge(totalNewReplies);
                }
            }
        }
    } catch (error) {
        console.error('Error checking for replies:', error);
    }
}

// Show notification for new reply
function showReplyNotification(contact, reply) {
    // Create a more detailed notification for replies
    const notification = document.createElement('div');
    notification.className = 'reply-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10001;
        background: white;
        border-left: 4px solid #2E7D32;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 15px;
        max-width: 350px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <div style="background: #2E7D32; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-reply" style="color: white;"></i>
            </div>
            <div style="flex: 1;">
                <h6 style="margin: 0 0 5px 0; color: #2E7D32;">Balasan dari Admin</h6>
                <p style="margin: 0 0 5px 0; font-size: 13px; color: #666;">
                    <strong>${contact.name}</strong> - ${new Date(reply.reply_date).toLocaleString()}
                </p>
                <p style="margin: 0; font-size: 14px; color: #333;">
                    ${reply.reply_message.substring(0, 100)}${reply.reply_message.length > 100 ? '...' : ''}
                </p>
                <small style="color: #999; margin-top: 5px; display: block;">Klik untuk melihat detail</small>
            </div>
            <button class="close-notification" style="background: none; border: none; cursor: pointer; color: #999;">&times;</button>
        </div>
    `;
    
    // Add click handler to show full message
    notification.addEventListener('click', function(e) {
        if (!e.target.classList.contains('close-notification')) {
            showFullReplyDialog(contact, reply);
            notification.remove();
        }
    });
    
    // Close button handler
    notification.querySelector('.close-notification').addEventListener('click', function(e) {
        e.stopPropagation();
        notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
}

// Show full reply dialog
function showFullReplyDialog(contact, reply) {
    // Create modal dialog
    const modalHtml = `
        <div id="replyDetailModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10002;">
            <div style="background: white; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow: auto; animation: slideUp 0.3s ease;">
                <div style="padding: 20px; border-bottom: 1px solid #eee;">
                    <h4 style="color: #2E7D32; margin: 0;">
                        <i class="fas fa-reply"></i> Balasan dari Admin
                    </h4>
                </div>
                <div style="padding: 20px;">
                    <p><strong>Pesan Anda:</strong></p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        ${contact.message}
                    </div>
                    <p><strong>Balasan Admin:</strong></p>
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 3px solid #2E7D32;">
                        <small style="color: #666;">${new Date(reply.reply_date).toLocaleString()}</small>
                        <p style="margin-top: 10px;">${reply.reply_message}</p>
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <p style="color: #666; font-size: 12px;">
                            Untuk membalas, silakan kirim pesan baru melalui form kontak.
                        </p>
                        <button onclick="closeReplyModal()" class="btn btn-primary" style="background: #2E7D32; border: none; padding: 10px 30px;">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('replyDetailModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Close on background click
    document.getElementById('replyDetailModal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// Close reply modal function
window.closeReplyModal = function() {
    const modal = document.getElementById('replyDetailModal');
    if (modal) modal.remove();
};

// Show reply badge in navbar
function showReplyBadge(count) {
    // Check if badge already exists
    let badge = document.querySelector('.reply-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'reply-badge';
        badge.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: bold;
            font-size: 18px;
            transition: all 0.3s ease;
        `;
        badge.innerHTML = `<i class="fas fa-envelope"></i><span style="position: absolute; top: -5px; right: -5px; background: #ff4444; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; display: flex; align-items: center; justify-content: center;">${count}</span>`;
        badge.title = `${count} balasan baru dari admin`;
        badge.onclick = () => checkForReplies(localStorage.getItem('userEmail'));
        document.body.appendChild(badge);
        
        // Auto hide after 10 seconds
        setTimeout(() => {
            if (badge.parentNode) {
                badge.style.opacity = '0';
                setTimeout(() => badge.remove(), 300);
            }
        }, 10000);
    } else {
        // Update badge count
        const span = badge.querySelector('span');
        if (span) span.textContent = count;
        badge.title = `${count} balasan baru dari admin`;
    }
}

// Start periodic reply checking
function startPeriodicReplyCheck() {
    // Check every 2 minutes (120000 ms)
    setInterval(() => {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
            checkForReplies(userEmail);
        }
    }, 120000);
    
    // Also check when page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const userEmail = localStorage.getItem('userEmail');
            if (userEmail) {
                checkForReplies(userEmail);
            }
        }
    });
}

// Add loading animation
window.addEventListener('load', function() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loading);
    
    setTimeout(() => {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.remove();
        }, 500);
    }, 1000);
});

// Parallax effect for hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
});

// Animate numbers in membership
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const prices = entry.target.querySelectorAll('.amount');
            prices.forEach(price => {
                const finalValue = parseInt(price.innerText.replace(/\./g, ''));
                let currentValue = 0;
                const increment = finalValue / 50;
                
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= finalValue) {
                        clearInterval(timer);
                        price.innerText = finalValue.toLocaleString('id-ID');
                    } else {
                        price.innerText = Math.floor(currentValue).toLocaleString('id-ID');
                    }
                }, 20);
            });
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

const membershipSection = document.querySelector('.membership');
if (membershipSection) {
    observer.observe(membershipSection);
}

// Hover effect for class cards
const classCards = document.querySelectorAll('.class-card');
classCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Form validation with real-time feedback
const inputs = document.querySelectorAll('#contactForm input, #contactForm textarea, #membershipForm input');
inputs.forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            this.style.borderColor = '#dc3545';
            this.style.borderWidth = '2px';
        } else {
            this.style.borderColor = '#e0e0e0';
            this.style.borderWidth = '2px';
        }
    });
    
    input.addEventListener('focus', function() {
        this.style.borderColor = '#2E7D32';
        this.style.borderWidth = '2px';
    });
    
    // Real-time validation for email
    if (input.type === 'email') {
        input.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.style.borderColor = '#ffc107';
                this.title = 'Format email tidak valid';
            } else if (this.value && emailRegex.test(this.value)) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#e0e0e0';
            }
        });
    }
});

// Add smooth reveal animation for sections
const sections = document.querySelectorAll('section');
const revealSection = function(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
};

const sectionObserver = new IntersectionObserver(revealSection, {
    threshold: 0.1,
    rootMargin: '0px'
});

sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'all 0.6s ease-out';
    sectionObserver.observe(section);
});

// Custom Notification System (improved alert)
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        background: ${type === 'success' ? '#d4edda' : (type === 'error' ? '#f8d7da' : '#d1ecf1')};
        color: ${type === 'success' ? '#155724' : (type === 'error' ? '#721c24' : '#0c5460')};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : (type === 'error' ? '#f5c6cb' : '#bee5eb')};
        border-radius: 8px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Add notification animations to existing styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-content i {
        font-size: 20px;
    }
    
    /* Form validation styles */
    .form-control:invalid {
        border-color: #dc3545;
    }
    
    .form-control:valid {
        border-color: #28a745;
    }
    
    /* Reply notification hover effect */
    .reply-notification:hover {
        transform: translateX(-5px);
        transition: transform 0.3s ease;
    }
`;
document.head.appendChild(notificationStyles);

// Check server connection on load
async function checkServerConnection() {
    try {
        const response = await fetch(`${API_URL}/classes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ Server connected successfully');
        } else {
            console.warn('⚠️ Server connection issue');
        }
    } catch (error) {
        console.warn('⚠️ Unable to connect to server. Make sure backend is running on port 3000');
        showNotification('Tidak dapat terhubung ke server. Pastikan backend berjalan di port 3000', 'error');
    }
}

// Call server check on load
setTimeout(checkServerConnection, 2000);

// Add loading state for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
});

// Scroll spy for active nav link
const sections_spy = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections_spy.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Prevent double submission
let isSubmitting = false;
const allForms = document.querySelectorAll('form');
allForms.forEach(form => {
    form.addEventListener('submit', (e) => {
        if (isSubmitting) {
            e.preventDefault();
            return false;
        }
        isSubmitting = true;
        setTimeout(() => {
            isSubmitting = false;
        }, 3000);
    });
});

// Export functions for global use
window.checkForReplies = checkForReplies;
window.showReplyNotification = showReplyNotification;
window.bookClass = bookClass;
window.viewMyBookings = viewMyBookings;