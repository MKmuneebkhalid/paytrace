# Railway Deployment Guide

Deploy your PayTrace application to Railway in minutes!

## Prerequisites

- Railway account (sign up free at [railway.app](https://railway.app))
- GitHub repository with this code
- SendGrid API key (see SENDGRID_SETUP.md)
- PayTrace API credentials

---

## Option 1: Deploy via Railway Web UI (Recommended)

### Step 1: Create New Project

1. Go to [railway.app](https://railway.app) and log in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `paytrace` repository
5. Railway will automatically detect Node.js and start building

### Step 2: Configure Environment Variables

Once deployed, click on your service and go to the **Variables** tab.

Add these required variables:

```bash
# Node Environment
NODE_ENV=production

# PayTrace API Credentials
PAYTRACE_API_URL=https://api.paytrace.com
PAYTRACE_USERNAME=your-paytrace-username
PAYTRACE_PASSWORD=your-paytrace-password
PAYTRACE_INTEGRATOR_ID=your-integrator-id

# SendGrid Email Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key
EMAIL_FROM=Your Company <verified-email@yourcompany.com>

# Optional: Additional notification emails (comma-separated)
NOTIFICATION_EMAILS=admin@company.com,billing@company.com

# App URL (update after first deployment)
APP_URL=https://your-app.up.railway.app
```

**Note**: Railway auto-generates a domain like `your-app.up.railway.app`. After first deploy, update the `APP_URL` variable with your actual Railway URL.

### Step 3: Add Persistent Storage

⚠️ **IMPORTANT** - Your app stores payment links in `data/payment-links.json`:

1. Click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Volumes"** section
4. Click **"New Volume"**
5. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (should be plenty)
6. Click **"Add"**

Railway will redeploy your app with persistent storage.

### Step 4: Get Your App URL

1. After deployment completes, go to the **"Settings"** tab
2. Under **"Domains"**, you'll see your Railway domain
3. Copy the URL (e.g., `https://paytrace-production.up.railway.app`)
4. Go back to **"Variables"** tab
5. Update `APP_URL` with your actual Railway URL
6. The app will automatically redeploy

### Step 5: Test Your Deployment

1. Visit your Railway URL
2. Go to `/admin` to access the admin panel
3. Create a test payment link
4. Verify the email sends correctly

---

## Option 2: Deploy via Railway CLI

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

This will open your browser for authentication.

### Step 3: Initialize Project

```bash
cd /path/to/paytrace
railway init
```

Select "Create new project" and name it (e.g., "paytrace-app")

### Step 4: Link Project

```bash
railway link
```

Select the project you just created.

### Step 5: Set Environment Variables

You can set variables one by one:

```bash
railway variables set NODE_ENV=production
railway variables set PAYTRACE_API_URL=https://api.paytrace.com
railway variables set PAYTRACE_USERNAME=your-username
railway variables set PAYTRACE_PASSWORD=your-password
railway variables set PAYTRACE_INTEGRATOR_ID=your-id
railway variables set SENDGRID_API_KEY=SG.your-key
railway variables set EMAIL_FROM="Your Company <email@domain.com>"
railway variables set NOTIFICATION_EMAILS=admin@company.com
```

Or add a volume for persistent storage:

```bash
railway volume add --mount-path /app/data --size 1
```

### Step 6: Deploy

```bash
railway up
```

Wait for deployment to complete.

### Step 7: Get Domain and Update APP_URL

```bash
railway domain
```

Copy the domain, then:

```bash
railway variables set APP_URL=https://your-actual-domain.up.railway.app
```

---

## Custom Domain (Optional)

### Add Your Own Domain

1. In Railway dashboard, go to your service
2. Click **"Settings"** → **"Domains"**
3. Click **"Custom Domain"**
4. Enter your domain (e.g., `pay.yourcompany.com`)
5. Railway will show you DNS records to add
6. Add the CNAME record to your DNS provider:
   ```
   Type: CNAME
   Name: pay (or your subdomain)
   Value: your-app.up.railway.app
   ```
7. Wait for DNS propagation (can take up to 48 hours)
8. Update your `APP_URL` variable to use your custom domain

---

## Monitoring & Logs

### View Logs

**Web UI:**
1. Go to your Railway project
2. Click on your service
3. View real-time logs in the dashboard

**CLI:**
```bash
railway logs
```

### Monitor Metrics

Railway provides built-in monitoring:
- CPU usage
- Memory usage
- Network traffic
- Request logs

Access these in the **"Metrics"** tab of your service.

---

## Troubleshooting

### Build Failed

**Check:**
- Node.js version compatibility
- All dependencies in `package.json`
- Build logs for specific errors

**Solution:**
```bash
railway logs --build
```

### App Crashes on Start

**Check:**
- Environment variables are set correctly
- Database/storage volume is mounted
- Port configuration (Railway sets `PORT` automatically)

**Solution:**
```bash
railway logs
```

### Emails Not Sending

**Check:**
1. `SENDGRID_API_KEY` is set correctly
2. `EMAIL_FROM` matches a verified sender in SendGrid
3. SendGrid Activity Feed for blocked emails

### Payment Links Not Persisting

**Check:**
- Volume is mounted at `/app/data`
- Volume has sufficient space
- Check logs for write permission errors

---

## Scaling & Pricing

### Railway Free Tier

- ✅ $5 free credit per month
- ✅ Hobby plan features
- ✅ 500 GB outbound bandwidth
- ✅ Shared CPU/RAM

**Estimated costs for this app:**
- Light usage: ~$2-3/month (within free tier)
- Moderate usage: ~$5-8/month

### Need More Resources?

Upgrade to Railway Pro:
- Priority support
- More resources
- Custom resource limits
- SLA guarantees

---

## Security Checklist

Before going to production:

- [ ] Use production PayTrace API URL
- [ ] Verify all SendGrid sender emails
- [ ] Enable HTTPS only (Railway does this by default)
- [ ] Set strong environment variables
- [ ] Review Railway access permissions
- [ ] Set up monitoring alerts
- [ ] Test payment link expiration
- [ ] Backup payment links data regularly

---

## Backup & Recovery

### Manual Backup

Download your payment links data:

```bash
railway run cat data/payment-links.json > backup.json
```

### Restore from Backup

```bash
railway run "echo '$(cat backup.json)' > data/payment-links.json"
```

### Automated Backups

Consider setting up automated backups to:
- AWS S3
- Google Cloud Storage
- GitHub (for JSON data)

---

## Need Help?

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Status: https://railway.statuspage.io/
- PayTrace App Issues: See SETUP.txt or SENDGRID_SETUP.md
