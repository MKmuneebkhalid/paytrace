# SendGrid Email Setup Guide

This application uses **SendGrid** for sending payment link emails to customers.

## Quick Setup (5 minutes)

### Step 1: Sign Up for SendGrid

1. Go to [https://sendgrid.com/free/](https://sendgrid.com/free/)
2. Sign up for a **free account** (100 emails/day forever)
3. Verify your email address

### Step 2: Get Your API Key

1. Log into [SendGrid Dashboard](https://app.sendgrid.com/)
2. Go to **Settings → API Keys** (left sidebar)
3. Click **"Create API Key"** (blue button)
4. Name it: `PayTrace App`
5. Choose **"Full Access"** (or select "Restricted Access" with Mail Send permissions)
6. Click **"Create & View"**
7. **COPY THE KEY NOW** - it starts with `SG.` and you won't see it again!

### Step 3: Verify Sender Email(s)

⚠️ **CRITICAL STEP** - SendGrid requires sender verification:

1. Go to **Settings → Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in your information:
   - **From Email Address**: The email you'll send from (e.g., `billing@yourcompany.com`)
   - **From Name**: Your company name
   - Reply To: Same as From Email (or support email)
4. Click **"Create"**
5. Check your email and click the verification link
6. Wait for the green ✓ checkmark in SendGrid dashboard

**Important**: You must verify **each email address** you plan to send from!

### Step 4: Add to Your .env File

```bash
SENDGRID_API_KEY=SG.your_actual_api_key_here
EMAIL_FROM=Your Company Name <verified-email@yourcompany.com>
NOTIFICATION_EMAILS=admin@company.com,manager@company.com
```

### Step 5: Test It!

Start your server:
```bash
npm start
```

Create a test payment link from the admin panel at `http://localhost:3000/admin`

---

## For Zoho Sign Integration

If you're using the Zoho Sign webhook feature, you need to verify **additional emails**:

1. Get the list of all team members who will be sending Zoho Sign documents
2. Verify **each person's email** in SendGrid (repeat Step 3 for each)
3. When Zoho sends a webhook, the email will come from the account owner's verified email

**Why?** The app dynamically uses the Zoho account owner's email as the "from" address for a personalized experience.

---

## Troubleshooting

### Error: "The from address does not match a verified Sender Identity"

**Solution**: You forgot to verify the sender email! Go back to Step 3.

### Error: "Forbidden" or 403

**Solution**: Check that your API key has "Mail Send" permissions. Create a new API key with Full Access.

### Emails not sending but no error

**Solution**: 
1. Check your SendGrid dashboard for blocked emails
2. Verify you haven't exceeded the free tier limit (100/day)
3. Check SendGrid Activity Feed for delivery status

### Want to test without real emails?

Set up a test email with [MailTrap](https://mailtrap.io/) or [Ethereal](https://ethereal.email/) for development.

---

## Free Tier Limits

SendGrid Free Forever Plan:
- ✅ **100 emails per day**
- ✅ Unlimited contacts
- ✅ Email API
- ✅ Single Sender Verification
- ❌ No custom domain authentication (requires paid plan)

**Upgrade needed if:**
- You need more than 100 emails/day
- You want to send from your custom domain without "via sendgrid.net"

---

## Alternative: Using a Custom Domain (Optional)

For better deliverability and branding, authenticate your domain:

1. Go to **Settings → Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the DNS setup instructions
4. Once verified, you can send from any email at your domain without individual verification

**Note**: This requires DNS access and may take 24-48 hours to propagate.

---

## Need Help?

- SendGrid Docs: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- PayTrace App Issues: Check SETUP.txt in this project
