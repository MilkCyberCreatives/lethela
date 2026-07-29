# Lethela production hardening rollout

This rollout preserves the current interface and existing database records. Do not reset, reseed, or run `prisma db push` against production.

## 1. Git and deployment controls

- Keep Vercel production connected to `main`.
- Use preview deployments for all other branches.
- Protect `main`: require a pull request, one approval, resolved conversations, the `Validate` CI check, and the Vercel deployment check.
- Disable force pushes and branch deletion for `main`.

## 2. Canonical domain

Use `https://www.lethela.co.za` for both `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL`. The application also canonicalises the apex host to the `www` host for metadata, structured data, robots, and sitemap output.

## 3. Bank data encryption

Generate a dedicated 32-byte secret and store it only in protected server environment variables:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Set the result as `BANK_DATA_ENCRYPTION_KEY` in Vercel Production and Preview. Never commit or paste the real value into issues, pull requests, screenshots, or chat.

New vendor and rider bank account numbers are protected with AES-256-GCM before Prisma writes them. Existing plaintext values remain readable during the rollout so users are not locked out.

## 4. Backup and migration

1. Create a Neon point-in-time branch or provider snapshot.
2. Connect an isolated environment to the restored branch.
3. Compare counts for User, Vendor, RiderApplication, Product, Order, and OrderItem.
4. Test sign-in and one vendor/rider profile read against the restored copy.
5. Run the migration dry run:

```powershell
npm run security:encrypt-bank-data
```

6. Review the row counts, then apply only after the restore test passes:

```powershell
npm run security:encrypt-bank-data -- --apply
```

7. Run the dry run again. All `RowsToUpdate` values must be zero.

The script does not print bank account values. Re-running it after adding a dedicated key rotates transitional ciphertext to the dedicated key.

## 5. Private documents

Use a separate private Supabase bucket for KYC, banking proof, licence, and identity documents. Public access must be disabled. Confirm that unauthorised reads fail and that only the owning user/vendor or an authorised administrator can retrieve each object.

## 6. Production validation

Before merging to `main`:

```powershell
npm run check:production-env -- .env.production
npm run check:security-env -- .env.production
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

After deployment, verify the homepage, sitemap, robots, signup, sign-in, protected admin route, protected file route, vendor profile and rider profile. Complete a controlled Ozow sandbox order before enabling live payments.
