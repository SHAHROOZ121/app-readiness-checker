# Premium API Setup Guide

This guide walks you through setting up the Premium API for your users.

## Overview

Premium users can now integrate AppReady into their development environment (Replit, Lovable, VS Code, etc.) using our API.

**Features:**
- Get scan results programmatically
- Retrieve fix prompts for automation
- Build custom integrations
- Use in CI/CD pipelines

---

## Setup Steps

### 1. Create API Keys Table in Supabase

Go to your **Supabase Dashboard → SQL Editor** and run:

```sql
-- Create api_keys table for Premium users
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(active);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own keys
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);
```

### 2. Add Environment Variable

No new environment variables needed! The API uses existing Supabase credentials.

### 3. Deploy to Vercel

The API endpoints are automatically available:

- **Generate API key:** `POST /api/premium/api-keys`
- **List API keys:** `GET /api/premium/api-keys`
- **Revoke API key:** `DELETE /api/premium/api-keys`
- **Get scan results:** `GET /api/premium/scans/{scanId}`

---

## API Documentation

### Authentication

All API requests require a Bearer token:

```
Authorization: Bearer prem_your_api_key_here
```

### Endpoints

#### 1. Generate API Key

**Request:**
```
POST /api/premium/api-keys
Headers: 
  Authorization: Bearer {session_token}
  x-user-id: {user_id}

Body:
{
  "name": "My Replit Integration"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My Replit Integration",
  "apiKey": "prem_abc123...",
  "message": "Save your API key somewhere safe..."
}
```

#### 2. List API Keys

**Request:**
```
GET /api/premium/api-keys
Headers:
  Authorization: Bearer {session_token}
  x-user-id: {user_id}
```

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "My Replit Integration",
      "key_preview": "prem_abc...",
      "created_at": "2026-07-30T...",
      "active": true
    }
  ]
}
```

#### 3. Revoke API Key

**Request:**
```
DELETE /api/premium/api-keys
Headers:
  Authorization: Bearer {session_token}
  x-user-id: {user_id}

Body:
{
  "keyId": "uuid"
}
```

#### 4. Get Scan Results & Prompts

**Request:**
```
GET /api/premium/scans/{scanId}
Headers:
  Authorization: Bearer prem_your_api_key
```

**Response:**
```json
{
  "id": "scan-uuid",
  "url": "https://example.com",
  "createdAt": "2026-07-30T...",
  "score": 75,
  "categories": [
    {
      "name": "Performance",
      "percentage": 80
    },
    {
      "name": "Accessibility",
      "percentage": 65
    }
  ],
  "topFixes": [
    {
      "description": "Reduce unused JavaScript",
      "prompt": "Review your bundle size...",
      "category": "Performance"
    }
  ]
}
```

---

## Example Usage

### Using in Replit

1. User signs in to AppReady and generates an API key
2. In Replit, they create a `.env` file:
   ```
   APPREADY_API_KEY=prem_abc123...
   APPREADY_SCAN_ID=scan-uuid-here
   ```

3. In their Replit code:
   ```javascript
   const response = await fetch(
     `https://app-readiness-checker.vercel.app/api/premium/scans/${process.env.APPREADY_SCAN_ID}`,
     {
       headers: {
         Authorization: `Bearer ${process.env.APPREADY_API_KEY}`,
       },
     }
   );
   const scanResults = await response.json();
   console.log("Fix prompts:", scanResults.topFixes);
   ```

### Using in CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Get AppReady Scan
  run: |
    curl -H "Authorization: Bearer ${{ secrets.APPREADY_API_KEY }}" \
         https://app-readiness-checker.vercel.app/api/premium/scans/${{ env.SCAN_ID }}
```

---

## Security Notes

⚠️ **Important:**
- API keys grant access to scan results - keep them secret!
- Users should treat API keys like passwords
- Implement rate limiting on your end if using in high-frequency scenarios
- Revoke keys if they're compromised

---

## Future Enhancements

- [ ] Rate limiting per API key
- [ ] Webhook support (push results to external service)
- [ ] Batch scan retrieval
- [ ] Filter by date range
- [ ] Export to external formats

---

## Support

For issues or questions about the Premium API, contact support.
