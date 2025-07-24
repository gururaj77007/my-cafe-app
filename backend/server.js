const express = require('express');
const cors = require('cors');
const sqlite3 = require('better-sqlite3');
const cron = require('node-cron');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3('./cafe.db');

// ----------------------------
// Create customers and transactions tables
// ----------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    credit REAL DEFAULT 0,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    amount REAL,
    description TEXT,
    type TEXT,
    timestamp TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );
`);

// ----------------------------
// Append transaction to CSV
// ----------------------------
function appendTransactionToCSV(transaction) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `transactions_${date}.csv`;
  const header = 'id,customer_id,amount,description,type,timestamp\n';
  const csvLine = `${transaction.id},${transaction.customer_id},${transaction.amount},${transaction.description},${transaction.type},${transaction.timestamp}\n`;

  if (!fs.existsSync(filename)) fs.writeFileSync(filename, header + csvLine);
  else fs.appendFileSync(filename, csvLine);
}

// ----------------------------
// Send SMS via Termux
// ----------------------------
function sendSMS(phone, message) {
  exec(`termux-sms-send -n ${phone} "${message}"`, (error, stdout) => {
    if (error) console.error(`❌ Error sending SMS to ${phone}:`, error);
    else console.log(`✅ SMS sent to ${phone}:`, stdout);
  });
}

// ----------------------------
// Add customer endpoint
// ----------------------------
app.post('/addCustomer', (req, res) => {
  const { name, phone } = req.body;
  const date = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`INSERT INTO customers (name, phone, credit, date) VALUES (?, ?, ?, ?)`);
  const info = stmt.run(name, phone, 0, date);

  res.json({ message: '✅ Customer added successfully', customer_id: info.lastInsertRowid });
});

// ----------------------------
// Add transaction endpoint
// ----------------------------
app.post('/addTransaction', (req, res) => {
  const { customer_id, amount, description, type } = req.body;
  const timestamp = new Date().toISOString();
  const netAmount = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);

  const txnStmt = db.prepare(`INSERT INTO transactions (customer_id, amount, description, type, timestamp) VALUES (?, ?, ?, ?, ?)`);
  const txnInfo = txnStmt.run(customer_id, amount, description, type, timestamp);

  const updateStmt = db.prepare(`UPDATE customers SET credit = credit + ? WHERE id = ?`);
  updateStmt.run(netAmount, customer_id);

  appendTransactionToCSV({ id: txnInfo.lastInsertRowid, customer_id, amount, description, type, timestamp });

  res.json({ message: '✅ Transaction added', transaction_id: txnInfo.lastInsertRowid });
});

// ----------------------------
// Get all customers
// ----------------------------
app.get('/customers', (req, res) => {
  const customers = db.prepare(`SELECT * FROM customers`).all();
  res.json(customers);
});

// ----------------------------
// Get all transactions
// ----------------------------
app.get('/transactions', (req, res) => {
  const transactions = db.prepare(`SELECT * FROM transactions ORDER BY timestamp DESC`).all();
  res.json(transactions);
});

// ----------------------------
// Send daily report SMS by customer ID
// ----------------------------
app.get('/sendDailyReport/:customerId', (req, res) => {
  const customerId = req.params.customerId;
  const today = new Date().toISOString().split('T')[0];

  const customer = db.prepare(`SELECT name, phone FROM customers WHERE id = ?`).get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const transactions = db.prepare(`SELECT * FROM transactions WHERE customer_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC`).all(customerId, today);
  const closingRow = db.prepare(`SELECT credit as closingBalance FROM customers WHERE id = ?`).get(customerId);
  const closingBalance = closingRow ? closingRow.closingBalance : 0;

  let message = `Hello ${customer.name}, your daily report for ${today}:\nClosing Balance: ₹${closingBalance}\nTransactions:\n`;
  message += transactions.length ? transactions.map(txn => `${txn.type.toUpperCase()}: ₹${txn.amount} - ${txn.description}`).join('\n') : 'No transactions today.';

  sendSMS(customer.phone, message);
  res.json({ message: '✅ Daily report SMS sent.' });
});

// ----------------------------
// Total credits endpoint
// ----------------------------
app.get('/totalCredits', (req, res) => {
  const row = db.prepare(`SELECT SUM(credit) as totalCredits FROM customers`).get();
  res.json({ totalCredits: row.totalCredits || 0 });
});

// ----------------------------
// Daily summary endpoint
// ----------------------------
app.get('/dailySummary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const transactions = db.prepare(`SELECT * FROM transactions WHERE DATE(timestamp) = ?`).all(today);
  const credits = db.prepare(`SELECT SUM(credit) as totalCredits FROM customers`).get();

  res.json({ date: today, totalCredits: credits.totalCredits || 0, transactions });
});

// ----------------------------
// Customer summary with date filter
// ----------------------------
app.get('/customerSummary/:customer_id', (req, res) => {
  const { customer_id } = req.params;
  const { startDate, endDate } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const openingRow = db.prepare(`
    SELECT IFNULL(SUM(CASE WHEN type='credit' THEN amount WHEN type='debit' THEN -amount ELSE 0 END), 0) as openingBalance
    FROM transactions WHERE customer_id = ? AND DATE(timestamp) < ?
  `).get(customer_id, start);
  const openingBalance = openingRow ? openingRow.openingBalance : 0;

  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE customer_id = ? AND DATE(timestamp) BETWEEN ? AND ? ORDER BY timestamp ASC
  `).all(customer_id, start, end);

  const netChange = transactions.reduce((sum, txn) => txn.type === 'credit' ? sum + txn.amount : sum - txn.amount, 0);
  const closingBalance = openingBalance + netChange;

  res.json({ customer_id, openingBalance, closingBalance, transactions, startDate: start, endDate: end });
});

// ----------------------------
// Cron job: daily SMS at 8:30 PM
// ----------------------------
cron.schedule('30 20 * * *', () => {
  console.log('Running end-of-day SMS notifications...');
  const customers = db.prepare(`SELECT name, phone, credit FROM customers`).all();
  customers.forEach(cust => {
    if (cust.phone) {
      const msg = `Hello ${cust.name}, your cafe credit balance is ₹${cust.credit}. Thank you!`;
      sendSMS(cust.phone, msg);
    }
  });
});

// ----------------------------
// Start server
// ----------------------------
app.listen(3020, () => console.log('✅ Server running on port 3010'));
