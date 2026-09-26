# Gaxity Upload V1

Gaxity Upload is a simple anonymous file uploader built with a Cloudflare Worker and private Supabase Storage.

## Features

- No account required
- No API key required
- Web uploader with multiple-file support
- REST upload API: `POST /api/upload`
- Expiration options from 1 hour to 30 days, or never
- Private Supabase Storage; files are served through the Worker
- Scheduled cleanup of expired files
- Supabase credentials stay server-side

## Environment secrets

Set these as Cloudflare Worker runtime secrets/variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never put the Supabase service-role key in frontend code or GitHub.

## Supabase

Bucket name:

`gaxity-uploads`

The bucket should remain **private**. The Worker uses the Supabase service-role key to upload, download, and delete files.

## API

### Upload

`POST /api/upload`

Use multipart/form-data with:

- `file` — the file to upload
- `expires` — one of `0`, `3600`, `21600`, `43200`, `86400`, `259200`, `604800`, `2592000`

Example with curl:

```bash
curl -X POST https://upload.gaxity.com.ng/api/upload \
  -F "file=@photo.jpg" \
  -F "expires=86400"
```

The response contains a public Gaxity Upload URL such as:

`https://upload.gaxity.com.ng/f/<stored-name>`

### Health check

`GET /api/health`

## Expiration

Expiration is stored in the object name. Expired files are rejected when requested and removed by the scheduled cleanup task.

## Security

The upload API is intentionally anonymous, so production deployments should add abuse protection such as Cloudflare rate limiting/WAF rules before opening the service to unrestricted public traffic.

The Worker also keeps the Supabase service-role key private and serves stored files through the Gaxity domain rather than exposing the Supabase URL.

## Deployment

The project is designed for Cloudflare Workers with Static Assets. The Worker configuration should include the static asset directory and the scheduled cleanup cron.

## License

Use and modify this project as needed for Gaxity.
