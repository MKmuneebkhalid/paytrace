import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCustomerProfile,
  updateCustomerProfile,
  getCustomerProfile,
  deleteCustomerProfile,
} from './services/paytrace.js';
import {
  createPaymentLink,
  getPaymentLink,
  getAllPaymentLinks,
  completePaymentLink,
  markEmailSent,
  cancelPaymentLink,
  deletePaymentLink,
  getStats,
} from './services/paymentLinks.js';
import {
  sendPaymentLinkEmail,
  sendPaymentConfirmationEmail,
  isEmailConfigured,
} from './services/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// =============================================================================
// PAYMENT LINKS API
// =============================================================================

/**
 * Create a new payment link
 * POST /api/payment-links
 */
app.post('/api/payment-links', async (req, res) => {
  try {
    const { customerEmail, customerName, customerId, invoiceNumber, amount, description, expiresInDays, sendEmail } = req.body;
    
    if (!customerEmail) {
      return res.status(400).json({ error: 'customerEmail is required' });
    }
    
    // Create the payment link
    const paymentLink = createPaymentLink({
      customerEmail,
      customerName,
      customerId,
      invoiceNumber,
      amount,
      description,
      expiresInDays,
    });
    
    // Generate the full URL
    const paymentUrl = `${APP_URL}/pay/${paymentLink.linkId}`;
    
    // Optionally send email immediately
    let emailResult = null;
    if (sendEmail) {
      if (!isEmailConfigured()) {
        console.warn('Email requested but not configured');
      } else {
        try {
          emailResult = await sendPaymentLinkEmail(paymentLink);
          markEmailSent(paymentLink.linkId);
        } catch (emailError) {
          console.error('Failed to send email:', emailError.message);
        }
      }
    }
    
    res.status(201).json({
      success: true,
      paymentLink: {
        ...paymentLink,
        paymentUrl,
      },
      emailSent: !!emailResult,
    });
  } catch (error) {
    console.error('Error creating payment link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all payment links
 * GET /api/payment-links
 */
app.get('/api/payment-links', (req, res) => {
  try {
    const { status, limit } = req.query;
    const links = getAllPaymentLinks({ 
      status, 
      limit: limit ? parseInt(limit) : 100 
    });
    
    // Add full URL to each link
    const linksWithUrls = links.map(link => ({
      ...link,
      paymentUrl: `${APP_URL}/pay/${link.linkId}`,
    }));
    
    res.json({
      success: true,
      count: linksWithUrls.length,
      links: linksWithUrls,
    });
  } catch (error) {
    console.error('Error getting payment links:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payment links statistics
 * GET /api/payment-links/stats
 */
app.get('/api/payment-links/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a specific payment link
 * GET /api/payment-links/:linkId
 */
app.get('/api/payment-links/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const link = getPaymentLink(linkId);
    
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    res.json({
      success: true,
      paymentLink: {
        ...link,
        paymentUrl: `${APP_URL}/pay/${link.linkId}`,
      },
    });
  } catch (error) {
    console.error('Error getting payment link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send/resend email for a payment link
 * POST /api/payment-links/:linkId/send-email
 */
app.post('/api/payment-links/:linkId/send-email', async (req, res) => {
  try {
    const { linkId } = req.params;
    const link = getPaymentLink(linkId);
    
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    if (link.status !== 'pending') {
      return res.status(400).json({ error: `Cannot send email for ${link.status} link` });
    }
    
    if (!isEmailConfigured()) {
      return res.status(400).json({ 
        error: 'Email is not configured. Set EMAIL_USER and EMAIL_PASS environment variables.',
        paymentUrl: `${APP_URL}/pay/${link.linkId}`,
      });
    }
    
    const emailResult = await sendPaymentLinkEmail(link);
    markEmailSent(linkId);
    
    res.json({
      success: true,
      message: `Email sent to ${link.customerEmail}`,
      ...emailResult,
    });
  } catch (error) {
    console.error('Error sending email:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel a payment link
 * POST /api/payment-links/:linkId/cancel
 */
app.post('/api/payment-links/:linkId/cancel', (req, res) => {
  try {
    const { linkId } = req.params;
    const link = getPaymentLink(linkId);
    
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    if (link.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel ${link.status} link` });
    }
    
    const updatedLink = cancelPaymentLink(linkId);
    
    res.json({
      success: true,
      paymentLink: updatedLink,
    });
  } catch (error) {
    console.error('Error cancelling payment link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a payment link
 * DELETE /api/payment-links/:linkId
 */
app.delete('/api/payment-links/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const deleted = deletePaymentLink(linkId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// CUSTOMER-FACING PAYMENT PAGE
// =============================================================================

/**
 * Serve the payment page for a specific link
 * GET /pay/:linkId
 */
app.get('/pay/:linkId', (req, res) => {
  const { linkId } = req.params;
  const link = getPaymentLink(linkId);
  
  if (!link) {
    return res.status(404).send(getErrorPage('Payment Link Not Found', 'This payment link does not exist or has been removed.'));
  }
  
  if (link.status === 'completed') {
    return res.send(getSuccessPage(link));
  }
  
  if (link.status === 'expired') {
    return res.status(410).send(getErrorPage('Link Expired', 'This payment link has expired. Please contact us for a new link.'));
  }
  
  if (link.status === 'cancelled') {
    return res.status(410).send(getErrorPage('Link Cancelled', 'This payment link has been cancelled.'));
  }
  
  // Serve the payment form with pre-filled data
  res.sendFile(path.join(__dirname, '../public/pay.html'));
});

/**
 * Get payment link data for the form
 * GET /api/pay/:linkId
 */
app.get('/api/pay/:linkId', (req, res) => {
  const { linkId } = req.params;
  const link = getPaymentLink(linkId);
  
  if (!link) {
    return res.status(404).json({ error: 'Payment link not found' });
  }
  
  if (link.status !== 'pending') {
    return res.status(400).json({ error: `This link is ${link.status}`, status: link.status });
  }
  
  // Return link data (excluding sensitive internal fields)
  res.json({
    success: true,
    linkId: link.linkId,
    customerName: link.customerName,
    customerEmail: link.customerEmail,
    customerId: link.customerId,
    invoiceNumber: link.invoiceNumber,
    amount: link.amount,
    description: link.description,
    expiresAt: link.expiresAt,
  });
});

/**
 * Process payment from the payment link form
 * POST /api/pay/:linkId
 */
app.post('/api/pay/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const link = getPaymentLink(linkId);
    
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    if (link.status !== 'pending') {
      return res.status(400).json({ error: `This link is already ${link.status}` });
    }
    
    const { cardNumber, expirationMonth, expirationYear, cvv, billingAddress } = req.body;
    
    if (!cardNumber || !expirationMonth || !expirationYear) {
      return res.status(400).json({ error: 'Missing required card details' });
    }
    
    // Create customer profile in PayTrace
    const result = await createCustomerProfile({
      customerId: link.customerId,
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
      billingAddress: billingAddress || {
        name: link.customerName,
      },
    });
    
    // Mark payment link as completed
    const updatedLink = completePaymentLink(linkId, {
      maskedCardNumber: result.maskedCardNumber,
      paytraceCustId: result.customerId,
    });
    
    // Send confirmation email (non-blocking)
    sendPaymentConfirmationEmail(updatedLink).catch(err => {
      console.error('Failed to send confirmation email:', err.message);
    });
    
    res.json({
      success: true,
      maskedCardNumber: result.maskedCardNumber,
      customerId: result.customerId,
    });
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ZOHO SIGN WEBHOOK (Future-ready)
// =============================================================================

/**
 * Webhook endpoint for Zoho Sign
 * POST /api/webhooks/zoho-sign
 */
app.post('/api/webhooks/zoho-sign', async (req, res) => {
  try {
    console.log('Zoho Sign webhook received:', JSON.stringify(req.body, null, 2));
    
    const { requests } = req.body;
    
    if (!requests || !requests.request_status) {
      return res.status(200).json({ received: true });
    }
    
    // Only process sent documents (when you send to client)
    if (requests.request_status !== 'inprogress') {
      return res.status(200).json({ received: true, status: requests.request_status });
    }
    
    // Extract customer info from Zoho Sign payload
    const actions = requests.actions || [];
    const signerAction = actions.find(a => 
      a.action_type === 'SIGN' && 
      a.recipient_email && 
      a.action_status !== 'COMPLETED'
    );
    
    if (!signerAction) {
      return res.status(200).json({ received: true, message: 'No signer found' });
    }
    
    const customerEmail = signerAction.recipient_email;
    const customerName = signerAction.recipient_name;
    const documentName = requests.document_ids?.[0]?.document_name || 'Document';
    
    if (!customerEmail) {
      return res.status(200).json({ received: true, message: 'No email found' });
    }
    
    // Create payment link automatically
    const paymentLink = createPaymentLink({
      customerEmail,
      customerName,
      invoiceNumber: requests.request_id,
      description: `Card on File - ${documentName}`,
      expiresInDays: 30,
    });
    
    // Send email if configured
    if (isEmailConfigured()) {
      try {
        await sendPaymentLinkEmail(paymentLink);
        markEmailSent(paymentLink.linkId);
        console.log(`✅ Payment link email sent to ${customerEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send payment link email:', emailError.message);
      }
    } else {
      console.warn('⚠️ Email not configured - payment link created but not sent');
    }
    
    console.log(`✅ Payment link created for ${customerEmail}: ${APP_URL}/pay/${paymentLink.linkId}`);
    
    res.status(200).json({
      received: true,
      paymentLinkCreated: true,
      linkId: paymentLink.linkId,
    });
  } catch (error) {
    console.error('Error processing Zoho Sign webhook:', error.message);
    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true, error: error.message });
  }
});

// =============================================================================
// LEGACY CUSTOMER PROFILE API (Direct card entry)
// =============================================================================

/**
 * Create customer profile directly
 * POST /api/customers
 */
app.post('/api/customers', async (req, res) => {
  try {
    const { customerId, cardNumber, expirationMonth, expirationYear, cvv, billingAddress } = req.body;
    
    if (!customerId || !cardNumber || !expirationMonth || !expirationYear) {
      return res.status(400).json({ error: 'Missing required fields: customerId, cardNumber, expirationMonth, expirationYear' });
    }

    const result = await createCustomerProfile({
      customerId,
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
      billingAddress,
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating customer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update customer profile
 * PUT /api/customers/:customerId
 */
app.put('/api/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { hpfToken, encKey, expirationMonth, expirationYear, billingAddress } = req.body;

    const result = await updateCustomerProfile({
      customerId,
      hpfToken,
      encKey,
      expirationMonth,
      expirationYear,
      billingAddress,
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating customer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get customer profile
 * GET /api/customers/:customerId
 */
app.get('/api/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await getCustomerProfile(customerId);
    res.json(customer);
  } catch (error) {
    console.error('Error getting customer:', error.message);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Delete customer profile
 * DELETE /api/customers/:customerId
 */
app.delete('/api/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    await deleteCustomerProfile(customerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// UTILITY PAGES
// =============================================================================

function getErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e17;
      color: #f0f4fc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      color: #ef4444;
    }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #8b9dc3; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
}

function getSuccessPage(link) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Complete</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e17;
      color: #f0f4fc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      color: #10b981;
    }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #8b9dc3; line-height: 1.6; margin-bottom: 8px; }
    .card-info {
      background: #1a2235;
      border: 1px solid #2a3650;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }
    .card-info strong { color: #f0f4fc; }
  </style>
</head>
<body>
  <div class="container">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
    <h1>Card Already Saved</h1>
    <p>This payment link has already been completed.</p>
    <div class="card-info">
      <p><strong>Card:</strong> ${link.maskedCardNumber || 'xxxx-xxxx-xxxx-xxxx'}</p>
      <p><strong>Completed:</strong> ${new Date(link.completedAt).toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>
  `;
}

// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 PayTrace Card-on-File Server v2.0`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Admin:  http://localhost:${PORT}/admin`);
  console.log(`\n📧 Email: ${isEmailConfigured() ? 'Configured ✓' : 'Not configured (set EMAIL_USER & EMAIL_PASS)'}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST /api/payment-links          Create payment link`);
  console.log(`   GET  /api/payment-links          List all links`);
  console.log(`   GET  /api/payment-links/:id      Get link details`);
  console.log(`   POST /api/payment-links/:id/send-email  Send email`);
  console.log(`   POST /api/payment-links/:id/cancel      Cancel link`);
  console.log(`   DELETE /api/payment-links/:id    Delete link`);
  console.log(`\n🔗 Payment Pages:`);
  console.log(`   GET  /pay/:linkId                Customer payment page`);
  console.log(`\n🪝 Webhooks:`);
  console.log(`   POST /api/webhooks/zoho-sign     Zoho Sign webhook`);
  console.log('');
});
