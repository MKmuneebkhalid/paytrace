import sgMail from '@sendgrid/mail';

// Email configuration from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Check if email is configured
 */
export function isEmailConfigured() {
  return !!(SENDGRID_API_KEY && EMAIL_FROM);
}

/**
 * Send payment link email to customer
 */
export async function sendPaymentLinkEmail(paymentLink) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    throw new Error('Email is not configured. Set SENDGRID_API_KEY and EMAIL_FROM environment variables.');
  }
  
  const paymentUrl = `${APP_URL}/pay/${paymentLink.linkId}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Payment Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a2235 0%, #2a3650 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Secure Payment Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${paymentLink.customerName || 'Valued Customer'},
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Please click the button below to securely save your payment card on file.
              </p>
              
              ${paymentLink.description ? `
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>Reference:</strong> ${paymentLink.description}
              </p>
              ` : ''}
              
              ${paymentLink.invoiceNumber ? `
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>Invoice:</strong> ${paymentLink.invoiceNumber}
              </p>
              ` : ''}
              
              ${paymentLink.amount ? `
              <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>Amount:</strong> $${paymentLink.amount.toFixed(2)}
              </p>
              ` : ''}
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${paymentUrl}" style="display: inline-block; padding: 16px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Save Card Securely
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                Or copy this link: <a href="${paymentUrl}" style="color: #3b82f6;">${paymentUrl}</a>
              </p>
              
              <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                This link expires on ${new Date(paymentLink.expiresAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                🔒 Your payment information is encrypted and secure.
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 11px;">
                Powered by PayTrace · PCI DSS Compliant
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  const textContent = `
Secure Payment Request

Hi ${paymentLink.customerName || 'Valued Customer'},

Please visit the following link to securely save your payment card on file:

${paymentUrl}

${paymentLink.description ? `Reference: ${paymentLink.description}` : ''}
${paymentLink.invoiceNumber ? `Invoice: ${paymentLink.invoiceNumber}` : ''}
${paymentLink.amount ? `Amount: $${paymentLink.amount.toFixed(2)}` : ''}

This link expires on ${new Date(paymentLink.expiresAt).toLocaleDateString()}.

Your payment information is encrypted and secure.
Powered by PayTrace
  `;
  
  const msg = {
    to: paymentLink.customerEmail,
    from: EMAIL_FROM,
    subject: `Secure Payment Request${paymentLink.invoiceNumber ? ` - ${paymentLink.invoiceNumber}` : ''}`,
    text: textContent,
    html: htmlContent,
  };
  
  try {
    const result = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: result[0].headers['x-message-id'],
      to: paymentLink.customerEmail,
    };
  } catch (error) {
    // Provide helpful error messages for common SendGrid issues
    if (error.response) {
      const errorMsg = error.response.body.errors?.[0]?.message || error.message;
      throw new Error(`SendGrid error: ${errorMsg}`);
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Send owner notification email when a card is saved
 */
export async function sendOwnerNotificationEmail(paymentLink, ownerEmail) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM || !ownerEmail) {
    // Silently skip if email not configured or no owner email
    return null;
  }
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">💳 New Card Saved</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                A customer has successfully saved their payment card.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Customer:</strong> ${paymentLink.customerName || 'N/A'}
                </p>
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Email:</strong> ${paymentLink.customerEmail}
                </p>
                ${paymentLink.invoiceNumber ? `
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Reference:</strong> ${paymentLink.invoiceNumber}
                </p>
                ` : ''}
                ${paymentLink.amount ? `
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Amount:</strong> $${paymentLink.amount.toFixed(2)}
                </p>
                ` : ''}
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Card:</strong> ${paymentLink.maskedCardNumber || 'xxxx-xxxx-xxxx-xxxx'}
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px;">
                  <strong>Saved:</strong> ${new Date(paymentLink.completedAt).toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                You can view this card in your PayTrace dashboard.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                🔒 Notification from PayTrace Integration
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  const msg = {
    to: ownerEmail,
    from: EMAIL_FROM,
    subject: `New Card Saved - ${paymentLink.customerName || paymentLink.customerEmail}${paymentLink.invoiceNumber ? ` - ${paymentLink.invoiceNumber}` : ''}`,
    html: htmlContent,
  };
  
  try {
    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0].headers['x-message-id'] };
  } catch (error) {
    console.error('Failed to send owner notification email:', error.message);
    return null;
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(paymentLink) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    // Silently skip if email not configured
    return null;
  }
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">✓ Card Saved Successfully</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${paymentLink.customerName || 'Valued Customer'},
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Your payment card has been securely saved on file.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                  <strong>Card:</strong> ${paymentLink.maskedCardNumber || 'xxxx-xxxx-xxxx-xxxx'}
                </p>
                ${paymentLink.invoiceNumber ? `
                <p style="margin: 0; color: #666666; font-size: 14px;">
                  <strong>Reference:</strong> ${paymentLink.invoiceNumber}
                </p>
                ` : ''}
              </div>
              
              <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                If you did not authorize this, please contact us immediately.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                🔒 Your payment information is encrypted and secure.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  const msg = {
    to: paymentLink.customerEmail,
    from: EMAIL_FROM,
    subject: `Card Saved Successfully${paymentLink.invoiceNumber ? ` - ${paymentLink.invoiceNumber}` : ''}`,
    html: htmlContent,
  };
  
  try {
    const result = await sgMail.send(msg);
    return { success: true, messageId: result[0].headers['x-message-id'] };
  } catch (error) {
    console.error('Failed to send confirmation email:', error.message);
    return null;
  }
}
