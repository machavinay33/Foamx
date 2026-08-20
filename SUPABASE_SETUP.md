# FOAMX Supabase and Netlify setup

The project is configured to use the public Supabase browser client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are available. No service-role key belongs in the browser or in this repository.

## Supabase

Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql`. In **Authentication**, create the team administrator account. After the account is created, run the following query with the administrator's Auth user UUID:

```sql
insert into public.profiles (id, email, role)
values ('YOUR_AUTH_USER_UUID', 'your-admin-email@example.com', 'admin')
on conflict (id) do update set role = 'admin';
```

The schema allows public order inserts while restricting product, offer, and order management to profiles whose role is `admin`. The public storefront also includes a local fallback catalog and local order storage so the interface remains reviewable before credentials are configured.

## Netlify

Set the following environment variables in **Site configuration → Environment variables**:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous key |

Build command: `pnpm build`. Publish directory: `dist/public`. The included `netlify.toml` rewrites all client-side routes to `index.html` for SPA navigation.

## Supabase Storage

For production product media, create a public Storage bucket such as `product-media`, upload product images or videos, and paste their public URLs into the `products` table. The included supplied FOAMX logo and promotional video are already referenced by the storefront's managed asset URLs.
