// server.js - Node.js/Express API for Transaction Data
// For SQLite (development) or PostgreSQL (production)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg'); // For PostgreSQL

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000'
    ];

console.log('✓ CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Database configuration
const USE_SQLITE = process.env.DB_TYPE === 'sqlite' || !process.env.DATABASE_URL;

let db;
if (USE_SQLITE) {
  // SQLite configuration (development)
  db = new sqlite3.Database('../database/transactions.db', (err) => {
    if (err) {
      console.error('Error connecting to SQLite:', err);
    } else {
      console.log('✓ Connected to SQLite database');
    }
  });
} else {
  // PostgreSQL configuration (production)
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('✓ Connected to PostgreSQL database');
}

// Helper function to run queries
const queryDB = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (USE_SQLITE) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      db.query(sql, params)
        .then(result => resolve(result.rows))
        .catch(err => reject(err));
    }
  });
};

// ============ API ROUTES ============

// Get all transactions with optional filters
app.get('/api/transactions', async (req, res) => {
  try {
    const { budget_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    
    if (budget_type) {
      sql += ` AND budget_type = ${USE_SQLITE ? '?' : '$' + (params.length + 1)}`;
      params.push(budget_type);
    }
    
    if (start_date) {
      sql += ` AND date >= ${USE_SQLITE ? '?' : '$' + (params.length + 1)}`;
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ` AND date <= ${USE_SQLITE ? '?' : '$' + (params.length + 1)}`;
      params.push(end_date);
    }
    
    sql += ' ORDER BY date DESC';
    sql += ` LIMIT ${USE_SQLITE ? '?' : '$' + (params.length + 1)}`;
    params.push(parseInt(limit));
    
    sql += ` OFFSET ${USE_SQLITE ? '?' : '$' + (params.length + 1)}`;
    params.push(parseInt(offset));
    
    const transactions = await queryDB(sql, params);
    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction by ID
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT * FROM transactions WHERE id = ${USE_SQLITE ? '?' : '$1'}`;
    const transactions = await queryDB(sql, [id]);

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({ success: true, data: transactions[0] });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { date, name, description, budget_type, amount, payedOff } = req.body;

    // Validate required fields
    if (!date || !amount || !budget_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, amount, and budget_type are required'
      });
    }

    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a valid number'
      });
    }

    // Default payedOff to true if not provided
    const payedOffValue = payedOff !== undefined ? payedOff : true;

    // Insert transaction
    const sql = USE_SQLITE
      ? 'INSERT INTO transactions (date, name, description, budget_type, amount, payedOff) VALUES (?, ?, ?, ?, ?, ?)'
      : 'INSERT INTO transactions (date, name, description, budget_type, amount, "payedOff") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';

    const params = [date, name || null, description || null, budget_type, parsedAmount, payedOffValue];

    if (USE_SQLITE) {
      // SQLite doesn't support RETURNING, so we need to get the inserted row separately
      const insertResult = await new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        });
      });

      // Fetch the newly created transaction
      const selectSql = 'SELECT * FROM transactions WHERE id = ?';
      const newTransaction = await queryDB(selectSql, [insertResult.id]);

      res.status(201).json({
        success: true,
        data: newTransaction[0],
        message: 'Transaction created successfully'
      });
    } else {
      // PostgreSQL supports RETURNING
      const result = await queryDB(sql, params);
      res.status(201).json({
        success: true,
        data: result[0],
        message: 'Transaction created successfully'
      });
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a transaction
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, description, budget_type, amount, payedOff } = req.body;

    // Validate required fields
    if (!date || !amount || !budget_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, amount, and budget_type are required'
      });
    }

    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a valid number'
      });
    }

    // Default payedOff to true if not provided
    const payedOffValue = payedOff !== undefined ? payedOff : true;

    // Update transaction
    const sql = USE_SQLITE
      ? 'UPDATE transactions SET date = ?, name = ?, description = ?, budget_type = ?, amount = ?, payedOff = ? WHERE id = ?'
      : 'UPDATE transactions SET date = $1, name = $2, description = $3, budget_type = $4, amount = $5, "payedOff" = $6 WHERE id = $7 RETURNING *';

    const params = USE_SQLITE
      ? [date, name || null, description || null, budget_type, parsedAmount, payedOffValue, id]
      : [date, name || null, description || null, budget_type, parsedAmount, payedOffValue, id];

    if (USE_SQLITE) {
      await new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
      });

      // Fetch the updated transaction
      const selectSql = 'SELECT * FROM transactions WHERE id = ?';
      const updatedTransaction = await queryDB(selectSql, [id]);

      if (updatedTransaction.length === 0) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      res.json({
        success: true,
        data: updatedTransaction[0],
        message: 'Transaction updated successfully'
      });
    } else {
      const result = await queryDB(sql, params);

      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      res.json({
        success: true,
        data: result[0],
        message: 'Transaction updated successfully'
      });
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists first
    const checkSql = `SELECT * FROM transactions WHERE id = ${USE_SQLITE ? '?' : '$1'}`;
    const existing = await queryDB(checkSql, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Delete the transaction
    const sql = `DELETE FROM transactions WHERE id = ${USE_SQLITE ? '?' : '$1'}`;

    if (USE_SQLITE) {
      await new Promise((resolve, reject) => {
        db.run(sql, [id], function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
      });
    } else {
      await queryDB(sql, [id]);
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get summary by budget type
app.get('/api/summary/budget-types', async (req, res) => {
  try {
    const sql = `
      SELECT 
        budget_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions
      GROUP BY budget_type
      ORDER BY total_amount DESC
    `;
    
    const summary = await queryDB(sql);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get monthly summary
app.get('/api/summary/monthly', async (req, res) => {
  try {
    const sql = USE_SQLITE ? `
      SELECT 
        strftime('%Y-%m', date) as month,
        budget_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM transactions
      GROUP BY strftime('%Y-%m', date), budget_type
      ORDER BY month DESC, total_amount DESC
    ` : `
      SELECT 
        DATE_TRUNC('month', date) as month,
        budget_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM transactions
      GROUP BY DATE_TRUNC('month', date), budget_type
      ORDER BY month DESC, total_amount DESC
    `;
    
    const summary = await queryDB(sql);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get category breakdown by month
app.get('/api/analytics/category-breakdown', async (req, res) => {
  try {
    const { month } = req.query; // Expected format: YYYY-MM

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month parameter is required (format: YYYY-MM)' });
    }

    const sql = USE_SQLITE ? `
      SELECT
        budget_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY budget_type
      ORDER BY total_amount DESC
    ` : `
      SELECT
        budget_type,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE TO_CHAR(date, 'YYYY-MM') = $1
      GROUP BY budget_type
      ORDER BY total_amount DESC
    `;

    const categoryData = await queryDB(sql, [month]);
    res.json({ success: true, data: categoryData });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get spending trends
app.get('/api/analytics/trends', async (req, res) => {
  try {
    const sql = USE_SQLITE ? `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(amount) as total_spending,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction
      FROM transactions
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    ` : `
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total_spending,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction
      FROM transactions
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month ASC
    `;
    
    const trends = await queryDB(sql);
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get total statistics
app.get('/api/stats/overview', async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        MIN(date) as first_transaction,
        MAX(date) as last_transaction,
        COUNT(DISTINCT budget_type) as budget_types_count
      FROM transactions
    `;
    
    const stats = await queryDB(sql);
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available months with data
app.get('/api/available-months', async (req, res) => {
  try {
    const sql = USE_SQLITE ? `
      SELECT DISTINCT strftime('%Y-%m', date) as month
      FROM transactions
      ORDER BY month DESC
    ` : `
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
      FROM transactions
      ORDER BY month DESC
    `;

    const months = await queryDB(sql);
    res.json({ success: true, data: months.map(m => m.month) });
  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unique budget types
app.get('/api/budget-types', async (req, res) => {
  try {
    const sql = 'SELECT DISTINCT budget_type FROM transactions ORDER BY budget_type';
    const types = await queryDB(sql);
    res.json({ success: true, data: types.map(t => t.budget_type) });
  } catch (error) {
    console.error('Error fetching budget types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    database: USE_SQLITE ? 'SQLite' : 'PostgreSQL'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Database: ${USE_SQLITE ? 'SQLite' : 'PostgreSQL'}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  http://${HOST}:${PORT}/api/health`);
  console.log(`  GET  http://${HOST}:${PORT}/api/transactions`);
  console.log(`  GET  http://${HOST}:${PORT}/api/transactions/:id`);
  console.log(`  GET  http://${HOST}:${PORT}/api/summary/budget-types`);
  console.log(`  GET  http://${HOST}:${PORT}/api/summary/monthly`);
  console.log(`  GET  http://${HOST}:${PORT}/api/analytics/trends`);
  console.log(`  GET  http://${HOST}:${PORT}/api/stats/overview`);
  console.log(`  GET  http://${HOST}:${PORT}/api/budget-types\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (USE_SQLITE) {
    db.close();
  } else {
    db.end();
  }
  process.exit(0);
});
