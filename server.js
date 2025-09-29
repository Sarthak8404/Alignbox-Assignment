const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'mysql-18b25f6a-sarthakmanmode789-7934.k.aivencloud.com',
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME || 'defaultdb',
  port: process.env.DB_PORT || 22349,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  ssl: {
    ca:`-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUfIBGxKzypDaINxvkTZD4TAh+PSYwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1M2QzMTA4NmQtMmJhYi00ZGNlLWJlMmMtZDlmNTcxZGUx
ODIzIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwOTI5MTQzMTU2WhcNMzUwOTI3MTQz
MTU2WjBAMT4wPAYDVQQDDDUzZDMxMDg2ZC0yYmFiLTRkY2UtYmUyYy1kOWY1NzFk
ZTE4MjMgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAI3W+IxsUEtbKfkwOS91/gu/sCGsvXRkO2RtDHaakI9gq3eti6JLqW4F
odQ8BtGwLebdd/u0Gtku5VOu5m5WL5ha00qO6rzGZan6uRMw2n0UrhBKgkKmwT6t
SlC9knRuE6MazrRGf1mWWoXg1tI7H9/whgUFe8VHUP7rGunJE1ZxJvb8ojhT0Z6p
kwy0ULEjgb3iFp00qWRguBbk8O/cTMPfWkDBgII6PVP2sEQkMhkv9OilbOGyyXlP
MtyNLYzgi0B5Kj/qVY3St9NnTnLHLARzODBSc6i+sP5r9Enqb+ndjoKfCTzcyKPd
ZwEblx4vUeRdr/MkyCEwdrVfoUO7ies7NqEAhzuguWj7Q96Zb7FliEAiYbYy9BUn
G6O+X6f09rE2Mw+X9MLP7tx0WCzC2WDK5Yymfo8/ebE0uUHEQa36vPsKgfO32cKa
8bfLH7k9Int8S+o6ROPMkJPh/nPMPKwBZomUFAzkew/hzcUZzWfJLtcns+vz9V8n
bh0fH5NlVwIDAQABo0IwQDAdBgNVHQ4EFgQUzdrPweZkCimP4P/24rAphhiZvVQw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAFibNenfhvFNFo1pLTe3FP/kOeO62b89ZCTTytPawEv1MajspNjypxp0J/AO
wTcErh2ZIWJaKH2YB0AKNn2kLQny58ADvICqg2bi6ONbf1f2hZNFwuIc7wo/5jDv
1M1yTDIA4ZAgdniSKYq5wZFcdEl6d7RSEv/fywIlhqViu474uRJWflwPzHe0z65x
MtMjUvt7jLDCZ0++I07IEJg/SflEJCOVPMQkDm8fWgGtdzkzf3Zlik5YEU3u7wiG
pbyRZVV92Ax+iX8q5TNW4Lvecv/bWM+vnaCZgd/yriDM8wB9KQrcqJE/yAUuKk/m
jWIY23M8R4ztzGFHQrQ2Ec0vD/4CTmDKwhCfXicsCsOklGmUH+7NTmlQwRWsso9j
40yOxIZebrJtkM2l1wNJvoeSYmGmoxM4ngnOF6UOzB2QFAfOwF2kUsgA4CVeq0AC
6iwCXMzXwKQFIjNmQ21niiLIYjov40DaRRI2aA/j2ZMbElDWVvjUky6pH+FY9r+e
zKYseg==
-----END CERTIFICATE-----`
  }
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and tables
async function initializeDatabase() {
    try {
        // Create messages table (pool automatically connects to DB)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                content TEXT NOT NULL,
                author VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                is_anonymous BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at)
            )
        `;
        await pool.execute(createTableQuery);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}


// API Routes

// Get all messages
app.get('/api/messages', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM messages ORDER BY created_at ASC LIMIT 100'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get recent messages (for polling)
app.get('/api/messages/recent', async (req, res) => {
    try {
        const since = req.query.since || new Date(Date.now() - 30000).toISOString(); // Last 30 seconds
        const [rows] = await pool.execute(
            'SELECT * FROM messages WHERE created_at > ? ORDER BY created_at ASC',
            [since]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching recent messages:', error);
        res.status(500).json({ error: 'Failed to fetch recent messages' });
    }
});

// Create new message
app.post('/api/messages', async (req, res) => {
    try {
        const { content, author, user_id, is_anonymous } = req.body;

        // Validate required fields
        if (!content || !author || !user_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Sanitize content
        const sanitizedContent = content.trim().substring(0, 1000); // Limit to 1000 characters

        if (!sanitizedContent) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }

        const [result] = await pool.execute(
            'INSERT INTO messages (content, author, user_id, is_anonymous) VALUES (?, ?, ?, ?)',
            [sanitizedContent, author, user_id, is_anonymous || false]
        );

        // Fetch the created message
        const [newMessage] = await pool.execute(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newMessage[0]);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
});

// Delete message (optional feature)
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const { user_id } = req.body;

        // Check if message exists and belongs to user
        const [message] = await pool.execute(
            'SELECT * FROM messages WHERE id = ? AND user_id = ?',
            [messageId, user_id]
        );

        if (message.length === 0) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        await pool.execute('DELETE FROM messages WHERE id = ?', [messageId]);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Get message count
app.get('/api/stats', async (req, res) => {
    try {
        const [totalMessages] = await pool.execute('SELECT COUNT(*) as count FROM messages');
        const [anonymousMessages] = await pool.execute('SELECT COUNT(*) as count FROM messages WHERE is_anonymous = TRUE');
        const [recentMessages] = await pool.execute(
            'SELECT COUNT(*) as count FROM messages WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
        );

        res.json({
            totalMessages: totalMessages[0].count,
            anonymousMessages: anonymousMessages[0].count,
            recentMessages: recentMessages[0].count
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();