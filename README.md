# Gaxity Upload V1
Cloudflare Worker + Supabase Storage anonymous file uploader.

Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never expose the service-role key in frontend files.
Bucket: gaxity-uploads (private).
API: POST /api/upload with multipart fields `file` and `expires`.
File URL: GET /f/<stored-name>.
Expiration: 0, 3600, 21600, 43200, 86400, 259200, 604800, 2592000 seconds.
V1 max file size: 100 MB.
