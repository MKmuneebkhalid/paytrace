# Resend Email Setup Guide

## ✅ Migration Complete!

Your PayTrace application has been successfully migrated from SendGrid to Resend.

## What Changed

1. **Package**: Replaced `@sendgrid/mail` with `resend`
2. **Email Service**: Updated `src/services/email.js` to use Resend API
3. **Configuration**: Updated `env.example` with Resend instructions

## Quick Start

### 1. Get Your Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Go to **API Keys** in the dashboard
3. Click **Create API Key**
4. Name it "PayTrace App"
5. Copy the API key (starts with `re_`)

### 2. Update Your `.env` File

Create or update your `.env` file:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_actual_api_key_here

# For testing (no verification needed!)
EMAIL_FROM=onboarding@resend.dev

# For production (requires domain verification)
# EMAIL_FROM=Your Company <noreply@yourdomain.com>

# Optional: Additional notification recipients
NOTIFICATION_EMAILS=admin@company.com,manager@company.com
```

### 3. Test It Out

Start your server:

```bash
npm start
```

Visit `http://localhost:3000/admin` and create a test payment link with email enabled.

## Key Benefits of Resend

✅ **No Email Verification Required** (for testing with `onboarding@resend.dev`)  
✅ **Simple Domain Verification** (for production - verify once, use any email)  
✅ **100 emails/day free** (3,000/month on paid plans)  
✅ **Modern API** (cleaner than SendGrid)  
✅ **Better Developer Experience**

## For Production Use

### Option 1: Continue Using Resend's Test Email (Quick)
Keep using `onboarding@resend.dev` - works immediately, no setup needed.

### Option 2: Use Your Own Domain (Recommended)
1. Go to Resend Dashboard → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides (SPF, DKIM, DMARC)
5. Wait for verification (usually 5-30 minutes)
6. Update `EMAIL_FROM` in `.env` to use your domain

Example:
```bash
EMAIL_FROM=PayTrace Notifications <noreply@yourdomain.com>
```

## Zoho Sign Webhook Integration

When payment links are created via Zoho Sign webhook, emails will be sent from the account owner's email (the person who sent the Zoho document).

**For this to work in production:**
- Verify your domain in Resend (not individual emails!)
- All team members' emails must use the verified domain
- Example: If you verify `company.com`, then `john@company.com` and `jane@company.com` will both work

## Testing Email Functionality

### Test 1: Create a Payment Link
```bash
curl -X POST http://localhost:3000/api/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "description": "Test Payment Link",
    "sendEmail": true
  }'
```

### Test 2: Check Server Logs
Look for:
```
📧 Email: Configured ✓
✅ Payment link email sent to test@example.com
```

## Troubleshooting

### "Email is not configured"
- Make sure `RESEND_API_KEY` is set in your `.env` file
- Restart your server after updating `.env`

### "Email error: API key is invalid"
- Double-check your API key in Resend dashboard
- Make sure it starts with `re_`
- No extra spaces or quotes

### Emails not being received
- Check spam folder
- Verify the recipient email is valid
- Check Resend dashboard → **Logs** for delivery status
- For production, make sure your domain is verified

## Railway Deployment

When deploying to Railway, add these environment variables:

```bash
RESEND_API_KEY=re_your_actual_api_key
EMAIL_FROM=onboarding@resend.dev  # or your verified domain email
APP_URL=https://your-app.up.railway.app
```

## Need Help?

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **API Reference**: https://resend.com/docs/api-reference/emails/send-email

---

**Migration completed on:** January 26, 2026  
**Previous provider:** SendGrid  
**New provider:** Resend
