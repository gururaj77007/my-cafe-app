const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const corsOptions = {
    origin: 'http://localhost:3002', // adjust if running React app on different IP:port in Android
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  };
  
  app.use(cors(corsOptions));
app.use(express.json());

const db = new sqlite3.Database('./cafe.db');

// ----------------------------
// Create customers table with phone number
// ----------------------------
db.run(`CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  credit REAL DEFAULT 0,
  date TEXT
)`);

// ----------------------------
// Create transactions table with type field
// ----------------------------
db.run(`CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  amount REAL,
  description TEXT,
  type TEXT,
  timestamp TEXT,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
)`);

// ----------------------------
// Append transaction to CSV efficiently
// ----------------------------
function appendTransactionToCSV(transaction) {
  const date = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  const filename = `transactions_${date}.csv`;

  const csvLine = `${transaction.id},${transaction.customer_id},${transaction.amount},${transaction.description},${transaction.type},${transaction.timestamp}\n`;

  if (!fs.existsSync(filename)) {
    const header = 'id,customer_id,amount,description,type,timestamp\n';
    fs.writeFileSync(filename, header + csvLine);
    console.log(`File ${filename} created with first transaction.`);
  } else {
    fs.appendFileSync(filename, csvLine);
    console.log(`Transaction appended to ${filename}`);
  }
}

// ----------------------------
// Function to send SMS using Termux:API (if needed)
// ----------------------------
function sendSMS(phone, message) {
  exec(`termux-sms-send -n ${phone} "${message}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error sending SMS to ${phone}:`, error);
      return;
    }
    console.log(`SMS sent to ${phone}:`, stdout);
  });
}

// ----------------------------
// Endpoint to add a customer
// ----------------------------
app.post('/addCustomer', (req, res) => {
  const { name, phone } = req.body;
  const date = new Date().toISOString().split('T')[0];

  db.run(
    `INSERT INTO customers (name, phone, credit, date) VALUES (?, ?, ?, ?)`,
    [name, phone, 0, date],
    function (err) {
      if (err) {
        console.error('Error adding customer:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Customer added successfully', customer_id: this.lastID });
    }
  );
});

// ----------------------------
// Endpoint to add a transaction (credit/debit)
// ----------------------------
app.post('/addTransaction', (req, res) => {
  const { customer_id, amount, description, type } = req.body;
  const timestamp = new Date().toISOString();

  // Calculate net amount based on transaction type
  let netAmount = amount;
  if (type === 'debit') {
    netAmount = -Math.abs(amount);
  } else if (type === 'credit') {
    netAmount = Math.abs(amount);
  } else {
    return res.status(400).json({ error: 'Invalid transaction type. Must be credit or debit.' });
  }

  db.run(
    `INSERT INTO transactions (customer_id, amount, description, type, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [customer_id, amount, description, type, timestamp],
    function (err) {
      if (err) {
        console.error('Error inserting transaction:', err);
        return res.status(500).json({ error: err.message });
      }

      const transactionId = this.lastID;

      db.run(
        `UPDATE customers SET credit = credit + ? WHERE id = ?`,
        [netAmount, customer_id],
        function (err2) {
          if (err2) {
            console.error('Error updating customer credit:', err2);
            return res.status(500).json({ error: err2.message });
          }

          // Append transaction to CSV
          const transaction = {
            id: transactionId,
            customer_id,
            amount,
            description,
            type,
            timestamp
          };
          appendTransactionToCSV(transaction);

          res.json({
            message: 'Transaction added, credit updated, and transaction saved to CSV',
            transaction_id: transactionId,
          });
        }
      );
    }
  );
});

// ----------------------------
// Endpoint to get all customers
// ----------------------------
app.get('/customers', (req, res) => {
  db.all(`SELECT * FROM customers`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ----------------------------
// Endpoint to get all transactions
// ----------------------------
app.get('/transactions', (req, res) => {
  db.all(`SELECT * FROM transactions ORDER BY timestamp DESC`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// ----------------------------
// Daily cron job at 8:30 PM to send SMS to all customers with their credit balance
// ----------------------------
cron.schedule('30 20 * * *', () => {
  console.log('Running end-of-day SMS notifications...');
  db.all(`SELECT name, phone, credit FROM customers`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching customers for SMS:', err);
      return;
    }

    rows.forEach(cust => {
      if (!cust.phone) {
        console.log(`No phone number for ${cust.name}, skipping SMS.`);
        return;
      }

      const message = `Hello ${cust.name}, your cafe credit balance is ₹${cust.credit}. Thank you!`;
      sendSMS(cust.phone, message);
    });
  });
});


app.get('/sendDailyReport/:customerId', (req, res) => {
  const customerId = req.params.customerId;

  // Get customer phone and summary for today
  const today = new Date().toISOString().split('T')[0];

  // Query customer details
  db.get(`SELECT name, phone FROM customers WHERE id = ?`, [customerId], (err, customer) => {
    if (err || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Query opening balance (sum credit before today)
    db.get(
      `SELECT SUM(credit) AS openingBalance FROM customers WHERE id = ? AND date < ?`,
      [customerId, today],
      (err2, openingRow) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const openingBalance = openingRow.openingBalance || 0;

        // Query today's transactions for the customer
        db.all(
          `SELECT * FROM transactions WHERE customer_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC`,
          [customerId, today],
          (err3, transactions) => {
            if (err3) return res.status(500).json({ error: err3.message });

            // Calculate closing balance (credit from customer row)
            db.get(`SELECT credit as closingBalance FROM customers WHERE id = ?`, [customerId], (err4, closingRow) => {
              if (err4) return res.status(500).json({ error: err4.message });

              const closingBalance = closingRow.closingBalance || 0;

              // Create message content
              let message = `Hello ${customer.name}, your daily report for ${today}:\n`;
              message += `Opening Balance: ₹${openingBalance}\n`;
              message += `Closing Balance: ₹${closingBalance}\n`;
              message += `Transactions:\n`;

              if (transactions.length === 0) {
                message += 'No transactions today.';
              } else {
                transactions.forEach((txn) => {
                  message += `${txn.type.toUpperCase()}: ₹${txn.amount} - ${txn.description}\n`;
                });
              }

              // Send SMS via termux-sms-send
              exec(`termux-sms-send -n ${customer.phone} "${message}"`, (execErr) => {
                if (execErr) {
                  console.error('Error sending SMS:', execErr);
                  return res.status(500).json({ error: 'Failed to send SMS' });
                }
                res.json({ message: 'Daily report SMS sent successfully.' });
              });
            });
          }
        );
      }
    );
  });
});

app.get('/totalCredits', (req, res) => {
    db.get(`SELECT SUM(credit) as totalCredits FROM customers`, [], (err, row) => {
      if (err) {
        console.error('Error fetching total credits:', err);
        return res.status(500).json({ error: err.message });
      }
  
      res.json({ totalCredits: row.totalCredits || 0 });
    });
  });
  app.get('/dailySummary', (req, res) => {
    const { startDate, endDate } = req.query;
  
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
  
    // Get opening balance: sum of credits before start date
    db.get(
      `SELECT SUM(credit) as openingBalance FROM customers`,
      [],
      (err, row) => {
        if (err) {
          console.error('Error fetching opening balance:', err);
          return res.status(500).json({ error: err.message });
        }
  
        const openingBalance = row.openingBalance || 0;
  
        // Get transactions within date range
        db.all(
          `SELECT * FROM transactions WHERE DATE(timestamp) BETWEEN ? AND ? ORDER BY timestamp ASC`,
          [start, end],
          (err2, transactions) => {
            if (err2) {
              console.error('Error fetching transactions:', err2);
              return res.status(500).json({ error: err2.message });
            }
  
            // Get closing balance: current total credits
            db.get(
              `SELECT SUM(credit) as closingBalance FROM customers`,
              [],
              (err3, row2) => {
                if (err3) {
                  console.error('Error fetching closing balance:', err3);
                  return res.status(500).json({ error: err3.message });
                }
  
                const closingBalance = row2.closingBalance || 0;
  
                res.json({
                  openingBalance,
                  closingBalance,
                  transactions,
                  startDate: start,
                  endDate: end
                });
              }
            );
          }
        );
      }
    );
  });
  // ----------------------------
// Endpoint to get opening balance, transactions, and closing balance for a customer with date filter
// ----------------------------
app.get('/customerSummary/:customer_id', (req, res) => {
    const customerId = req.params.customer_id;
    const { startDate, endDate } = req.query;
  
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
  
    // Get opening balance: sum of credits before start date
    db.get(
      `SELECT 
          IFNULL(SUM(
            CASE 
              WHEN type='credit' THEN amount 
              WHEN type='debit' THEN -amount 
              ELSE 0 
            END
          ), 0) as openingBalance 
        FROM transactions 
        WHERE customer_id = ? AND DATE(timestamp) < ?`,
      [customerId, start],
      (err, row) => {
        if (err) {
          console.error('Error fetching opening balance:', err);
          return res.status(500).json({ error: err.message });
        }
  
        const openingBalance = row.openingBalance || 0;
  
        // Get transactions within date range
        db.all(
          `SELECT * FROM transactions 
           WHERE customer_id = ? AND DATE(timestamp) BETWEEN ? AND ? 
           ORDER BY timestamp ASC`,
          [customerId, start, end],
          (err2, transactions) => {
            if (err2) {
              console.error('Error fetching transactions:', err2);
              return res.status(500).json({ error: err2.message });
            }
  
            // Calculate closing balance = opening + net transaction amount in range
            const netChange = transactions.reduce((sum, txn) => {
              if (txn.type === 'credit') return sum + txn.amount;
              else if (txn.type === 'debit') return sum - txn.amount;
              else return sum;
            }, 0);
  
            const closingBalance = openingBalance + netChange;
  
            res.json({
              customer_id: customerId,
              openingBalance,
              closingBalance,
              transactions,
              startDate: start,
              endDate: end
            });
          }
        );
      }
    );
  });
  

app.listen(3010, () => console.log('Server running on port 3010'));
