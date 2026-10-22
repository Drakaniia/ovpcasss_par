# Email delivery

Owner: OVPCASSS system administrator. Scope: outbound mail from the `par`
Worker — the Resend sender domain, how to tell whether it is working, and how to
finish it once DNS lands.

## State as of 2026-10-22

`EMAIL_API_KEY`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the
`par` Worker. The key is valid: a test send through Resend reached
`last_event: delivered`. The Worker's queue consumer also reaches Resend — the
`wrangler tail` stream shows the provider call and its answer.

What is missing is the **sender domain**. `send.buksu.edu.ph` was added to Resend
(domain id `11096304-b51e-4c25-8fa3-0fa141cfaf62`) but is `not_started`, because
`buksu.edu.ph` is not in this Cloudflare account and its four records have not
been published. Until they are, every send fails:

```
Resend rejected the message (403): The send.buksu.edu.ph domain is not verified.
```

Consequences: email/password registration and password reset cannot complete.
Sign-in, reports, reviews, approvals, exports, downloads and notifications are
unaffected. Google sign-in creates the account already verified, with a
`SUBMITTER` role, so it sidesteps the mail path entirely.

## The records

Add these to the DNS host that owns `buksu.edu.ph`. Names are relative to that
zone; the full hostnames are in the second column.

| Type  | Name in zone             | Full hostname                         | Value                                                                                                                                                                                                                        |
| ----- | ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TXT   | `resend._domainkey.send` | `resend._domainkey.send.buksu.edu.ph` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQeQ5FbR58OyPPEJ8deMGu9CMJh2XZ80VsgzYoXCoHyzHsHZlLy0uGAQ1SibuL+yduyGFUyIDOEs85ldizz/qYb58ocMh927os8y7jI81LXkAoNsuvK3Uz9vmaZmcWxiQVDx7zs2fIXS6kyyb7GcgSe3/LLNCuOH1yH4D7FVJ5KQIDAQAB` |
| MX    | `send.send`              | `send.send.buksu.edu.ph`              | `feedback-smtp.us-east-1.amazonses.com`, priority 10                                                                                                                                                                         |
| TXT   | `send.send`              | `send.send.buksu.edu.ph`              | `v=spf1 include:amazonses.com ~all`                                                                                                                                                                                          |
| CNAME | `rsend.send`             | `rsend.send.buksu.edu.ph`             | `send.forge.rmta.net`, **DNS only** (never proxied)                                                                                                                                                                          |

The repeated `send` label is correct: Resend appends the sending-domain label to
its standard record names. Leave TTL on Auto. Publish the DKIM TXT whole; a host
that splits values over 255 characters does that itself.

If the university would rather delegate, an `NS` record for `send.buksu.edu.ph`
pointing at a Cloudflare zone this account owns gives the same result and keeps
the zone under this team's control.

## Verify

1. Resolve each record from a public resolver:

   ```bash
   nslookup -type=TXT resend._domainkey.send.buksu.edu.ph 1.1.1.1
   nslookup -type=MX  send.send.buksu.edu.ph 1.1.1.1
   nslookup -type=TXT send.send.buksu.edu.ph 1.1.1.1
   nslookup -type=CNAME rsend.send.buksu.edu.ph 1.1.1.1
   ```

2. In Resend → Domains → `send.buksu.edu.ph`, press **Verify**. It moves off
   `not_started` within minutes once the records resolve.

3. Trigger one real send through the Worker and watch the consumer:

   ```bash
   cd apps/api && npx wrangler tail --format json > /tmp/tail.log 2>&1 &
   curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     https://par.ovpcasss.workers.dev/api/v1/auth/forgot-password \
     -H 'content-type: application/json' \
     -H 'origin: https://par.ovpcasss.workers.dev' \
     -d '{"email":"ovpcasss@buksu.edu.ph"}'
   ```

   Success looks like an `outcome: ok` event with no `Resend rejected` line.
   A 403 means DNS is still incomplete; check the CNAME is not proxied.

4. Confirm delivery at the provider rather than trusting the absence of an error:
   Resend → Emails shows the message with `delivered`, or
   `GET https://api.resend.com/emails/{id}` returns `"last_event":"delivered"`.

## Changing the sending domain

`EMAIL_FROM` lives in `apps/api/wrangler.toml` and only needs to sit on a domain
verified in Resend; it does not need to exist as a mailbox. Verification links are
built from the request origin, so they keep pointing at the deployed host, not the
sender. Re-run the check in "Verify" after changing it.
