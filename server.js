const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db');

require('dotenv').config();

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is missing from your .env file');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: 'caresync.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Local development over HTTP only
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// CHECK WHETHER THE USER IS LOGGED IN
// ========================================

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            message: 'Please log in to continue'
        });
    }

    next();
}

// ========================================
// CHECK BACKEND AND DATABASE CONNECTION
// ========================================

app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS databaseName'
        );

        res.json({
            status: 'OK',
            message: 'CareSync backend is connected to MySQL',
            database: rows[0].databaseName
        });
    } catch (error) {
        console.error('Health check failed:', error.message);

        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

// ========================================
// SIGNUP
// ========================================

app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email, and password are required'
            });
        }

        if (
            typeof password !== 'string' ||
            password.length < 8
        ) {
            return res.status(400).json({
                message: 'Password must contain at least 8 characters'
            });
        }

        if (
            typeof name !== 'string' ||
            typeof email !== 'string'
        ) {
            return res.status(400).json({
                message: 'Please provide a valid name and email'
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (
            !cleanName ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: 'Please provide a valid name and email'
            });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [cleanEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: 'An account with this email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await pool.execute(
            `INSERT INTO users (name, email, password)
             VALUES (?, ?, ?)`,
            [cleanName, cleanEmail, hashedPassword]
        );

        res.status(201).json({
            message: 'Signup successful. You can now log in.'
        });
    } catch (error) {
        console.error('Signup failed:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'This email is already registered'
            });
        }

        res.status(500).json({
            message: 'Unable to create account'
        });
    }
});

// ========================================
// LOGIN
// ========================================

app.post('/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        const loginEmail = (
            typeof email === 'string' ? email :
            typeof username === 'string' ? username : ''
        ).trim().toLowerCase();

        if (!loginEmail || typeof password !== 'string' || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const [users] = await pool.execute(
            `SELECT id, name, email, password
             FROM users
             WHERE email = ?`,
            [loginEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Create a fresh session after successful login.
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session creation failed:', err.message);

                return res.status(500).json({
                    message: 'Unable to create login session'
                });
            }

            // Store the authenticated user's details on the server.
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email
            };

            req.session.save((err) => {
                if (err) {
                    console.error('Session save failed:', err.message);

                    return res.status(500).json({
                        message: 'Unable to save login session'
                    });
                }

                res.json({
                    message: 'Login successful',
                    user: req.session.user
                });
            });
        });
    } catch (error) {
        console.error('Login failed:', error.message);

        res.status(500).json({
            message: 'Unable to log in'
        });
    }
});

// ========================================
// CHECK CURRENT LOGIN
// ========================================

app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            message: 'You are not logged in'
        });
    }

    res.json({
        user: req.session.user
    });
});

// ========================================
// LOGOUT
// ========================================

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout failed:', err.message);

            return res.status(500).json({
                message: 'Unable to log out'
            });
        }

        res.clearCookie('caresync.sid', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });

        res.json({
            message: 'Logged out successfully'
        });
    });
});

// ========================================
// GET ALL DOCTORS
// ========================================

app.get('/doctors', async (req, res) => {
    try {
        const [doctors] = await pool.execute(
            `SELECT id, name, specialization, experience, available
             FROM doctors`
        );

        res.json(doctors);
    } catch (error) {
        console.error('Could not load doctors:', error.message);

        res.status(500).json({
            message: 'Unable to load doctors'
        });
    }
});

// ========================================
// ADD A DOCTOR (DEVELOPMENT/DEMO ONLY)
// ========================================

// Protect this route with an admin role before deployment.
app.post('/doctors', async (req, res) => {
    try {
        const { name, specialization, experience } = req.body;

        if (
            typeof name !== 'string' ||
            typeof specialization !== 'string' ||
            !name.trim() ||
            !specialization.trim()
        ) {
            return res.status(400).json({
                message: 'Doctor name and specialization are required'
            });
        }

        const years = Number(experience || 0);

        if (!Number.isInteger(years) || years < 0) {
            return res.status(400).json({
                message: 'Experience must be a non-negative whole number'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO doctors
             (name, specialization, experience)
             VALUES (?, ?, ?)`,
            [name.trim(), specialization.trim(), years]
        );

        res.status(201).json({
            message: 'Doctor added successfully',
            doctorId: result.insertId
        });
    } catch (error) {
        console.error('Could not add doctor:', error.message);

        res.status(500).json({
            message: 'Unable to add doctor'
        });
    }
});

// ========================================
// BOOK AN APPOINTMENT
// ========================================

app.post('/appointments', requireLogin, async (req, res) => {
    let connection;

    try {
        const {
            doctor_id,
            appointment_date,
            appointment_time,
            reason
        } = req.body;

        // Get the user ID from the authenticated server session.
        // Never trust a user_id supplied by the browser.
        const userId = Number(req.session.user.id);
        const doctorId = Number(doctor_id);

        if (
            !doctor_id ||
            !appointment_date ||
            !appointment_time
        ) {
            return res.status(400).json({
                message: 'Doctor, date, and time are required'
            });
        }

        if (
            !Number.isInteger(userId) || userId < 1 ||
            !Number.isInteger(doctorId) || doctorId < 1
        ) {
            return res.status(400).json({
                message: 'Invalid user or doctor ID'
            });
        }

        if (
            typeof appointment_date !== 'string' ||
            typeof appointment_time !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date) ||
            !/^\d{2}:\d{2}(:\d{2})?$/.test(appointment_time)
        ) {
            return res.status(400).json({
                message: 'Use a valid date (YYYY-MM-DD) and time (HH:MM)'
            });
        }

        // Validate that the date really exists.
        const date = new Date(`${appointment_date}T00:00:00Z`);

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== appointment_date
        ) {
            return res.status(400).json({
                message: 'Invalid appointment date'
            });
        }

        // Prevent appointments in the past.
        const now = new Date();

        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');

        if (appointment_date < today) {
            return res.status(400).json({
                message: 'Appointment date cannot be in the past'
            });
        }

        const time = appointment_time.length === 5
            ? `${appointment_time}:00`
            : appointment_time;

        // Connect to MySQL and begin a transaction.
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Verify the logged-in user exists.
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        // Verify that the selected doctor is available.
        const [doctors] = await connection.execute(
            `SELECT id
             FROM doctors
             WHERE id = ? AND available = TRUE
             FOR UPDATE`,
            [doctorId]
        );

        if (users.length === 0 || doctors.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                message: 'User or available doctor not found'
            });
        }

        // Prevent another active appointment at the same doctor, date,
        // and time. Cancelled appointments do not block the slot.
        const [existing] = await connection.execute(
            `SELECT id
             FROM appointments
             WHERE doctor_id = ?
             AND appointment_date = ?
             AND appointment_time = ?
             AND status <> 'Cancelled'
             FOR UPDATE`,
            [doctorId, appointment_date, time]
        );

        if (existing.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: 'This appointment slot is already booked'
            });
        }

        // Insert the appointment for the authenticated user.
        const [result] = await connection.execute(
            `INSERT INTO appointments
             (user_id, doctor_id, appointment_date,
              appointment_time, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                doctorId,
                appointment_date,
                time,
                typeof reason === 'string'
                    ? reason.trim() || null
                    : null
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointmentId: result.insertId
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError.message);
            }
        }

        console.error('Appointment booking failed:', error.message);

        res.status(500).json({
            message: 'Unable to book appointment'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// ========================================
// GET APPOINTMENTS FOR THE LOGGED-IN USER
// ========================================

// Supports both /appointments and the existing
// frontend URL /appointments/:userId.
// The URL userId is intentionally ignored for security.
app.get(
    ['/appointments', '/appointments/:userId'],
    requireLogin,
    async (req, res) => {
        try {
            const userId = Number(req.session.user.id);

            const [appointments] = await pool.execute(
                `SELECT
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.reason,
                    a.status,
                    d.name AS doctor_name,
                    d.specialization
                 FROM appointments a
                 JOIN doctors d ON a.doctor_id = d.id
                 WHERE a.user_id = ?
                 ORDER BY a.appointment_date, a.appointment_time`,
                [userId]
            );

            res.json(appointments);
        } catch (error) {
            console.error(
                'Could not load appointments:',
                error.message
            );

            res.status(500).json({
                message: 'Unable to load appointments'
            });
        }
    }
);

// ========================================
// CANCEL A PENDING APPOINTMENT
// ========================================

app.post(
    '/appointments/:id/cancel',
    requireLogin,
    async (req, res) => {
        try {
            const appointmentId = Number(req.params.id);

            // Use the authenticated session, not req.body.user_id.
            const userId = Number(req.session.user.id);

            if (
                !Number.isInteger(appointmentId) ||
                appointmentId < 1 ||
                !Number.isInteger(userId) ||
                userId < 1
            ) {
                return res.status(400).json({
                    message: 'Invalid appointment ID'
                });
            }

            // Only the owner of a pending appointment can cancel it.
            const [result] = await pool.execute(
                `UPDATE appointments
                 SET status = 'Cancelled'
                 WHERE id = ?
                 AND user_id = ?
                 AND status = 'Pending'`,
                [appointmentId, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Pending appointment not found'
                });
            }

            res.json({
                message: 'Appointment cancelled successfully'
            });
        } catch (error) {
            console.error('Cancellation failed:', error.message);

            res.status(500).json({
                message: 'Unable to cancel appointment'
            });
        }
    }
);

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(
        `CareSync server running at http://localhost:${PORT}`
    );
});