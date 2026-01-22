import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/payment-links.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ links: [] }, null, 2));
}

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { links: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Create a new payment link
 */
export function createPaymentLink({
  customerEmail,
  customerName,
  customerId,
  invoiceNumber,
  amount,
  description,
  expiresInDays = 30,
  ownerEmail,
}) {
  const data = readData();
  
  const linkId = uuidv4().split('-')[0].toUpperCase(); // Short readable ID like "A1B2C3D4"
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  
  const paymentLink = {
    linkId,
    customerEmail,
    customerName,
    customerId: customerId || `CUST-${linkId}`,
    invoiceNumber: invoiceNumber || `INV-${linkId}`,
    amount: amount ? parseFloat(amount) : null,
    description: description || 'Card on File Request',
    status: 'pending', // pending, completed, expired, cancelled
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completedAt: null,
    emailSentAt: null,
    maskedCardNumber: null,
    ownerEmail: ownerEmail || null,
  };
  
  data.links.push(paymentLink);
  writeData(data);
  
  return paymentLink;
}

/**
 * Get a payment link by ID
 */
export function getPaymentLink(linkId) {
  const data = readData();
  const link = data.links.find(l => l.linkId === linkId.toUpperCase());
  
  if (!link) {
    return null;
  }
  
  // Check if expired
  if (link.status === 'pending' && new Date(link.expiresAt) < new Date()) {
    link.status = 'expired';
    writeData(data);
  }
  
  return link;
}

/**
 * Get all payment links
 */
export function getAllPaymentLinks({ status, limit = 100 } = {}) {
  const data = readData();
  let links = data.links;
  
  // Update expired links
  const now = new Date();
  links.forEach(link => {
    if (link.status === 'pending' && new Date(link.expiresAt) < now) {
      link.status = 'expired';
    }
  });
  writeData(data);
  
  // Filter by status if provided
  if (status) {
    links = links.filter(l => l.status === status);
  }
  
  // Sort by created date (newest first)
  links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return links.slice(0, limit);
}

/**
 * Update a payment link
 */
export function updatePaymentLink(linkId, updates) {
  const data = readData();
  const index = data.links.findIndex(l => l.linkId === linkId.toUpperCase());
  
  if (index === -1) {
    return null;
  }
  
  data.links[index] = { ...data.links[index], ...updates };
  writeData(data);
  
  return data.links[index];
}

/**
 * Mark a payment link as completed
 */
export function completePaymentLink(linkId, { maskedCardNumber, paytraceCustId }) {
  return updatePaymentLink(linkId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    maskedCardNumber,
    paytraceCustId,
  });
}

/**
 * Mark a payment link as email sent
 */
export function markEmailSent(linkId) {
  return updatePaymentLink(linkId, {
    emailSentAt: new Date().toISOString(),
  });
}

/**
 * Cancel a payment link
 */
export function cancelPaymentLink(linkId) {
  return updatePaymentLink(linkId, {
    status: 'cancelled',
  });
}

/**
 * Delete a payment link
 */
export function deletePaymentLink(linkId) {
  const data = readData();
  const index = data.links.findIndex(l => l.linkId === linkId.toUpperCase());
  
  if (index === -1) {
    return false;
  }
  
  data.links.splice(index, 1);
  writeData(data);
  
  return true;
}

/**
 * Get statistics
 */
export function getStats() {
  const data = readData();
  const links = data.links;
  
  return {
    total: links.length,
    pending: links.filter(l => l.status === 'pending').length,
    completed: links.filter(l => l.status === 'completed').length,
    expired: links.filter(l => l.status === 'expired').length,
    cancelled: links.filter(l => l.status === 'cancelled').length,
  };
}
