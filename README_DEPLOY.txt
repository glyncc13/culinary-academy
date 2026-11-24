Culinary Academy Netlify deployment

1. Upload THIS FOLDER using https://app.netlify.com/drop (not the ZIP file).
2. Do not upload the Supabase SQL schema, database credentials or private documentation.
3. Configure Supabase Authentication URL Configuration: Site URL = https://YOUR-SITE.netlify.app ; Redirect URLs include https://YOUR-SITE.netlify.app/** if email redirects are used.
4. Open the site, enter Supabase Project URL and publishable/anon key, sign in with the existing Owner account. Do NOT use secret/service_role keys.
5. Test in Chrome on Android; menu > Install app / Add to Home screen.
6. This is a PWA, not a native Android Play Store package. Internet is required for sign-in and training data. Supabase sessions are not persisted.
7. IMPORTANT: Release candidate only. Live integration, role-based permissions and security have not been independently verified.
