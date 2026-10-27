# Email delivery

Owner: OVPCASSS system administrator. Scope: outbound mail from the `par`
Worker — the Resend sender domain, how to tell whether it is working, and how to
finish it once DNS lands.

## Interim sender: Brevo (since 2026-10-26)

Resend only accepts a sender on a verified domain, so while `send.buksu.edu.ph`
waits on DNS the Worker sends through **Brevo** instead. Brevo verifies a single
*sender address* rather than a domain, so mail reaches every real recipient with
no DNS records at all:

| Var              | Value                                  | Effect                                                                |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `EMAIL_PROVIDER` | `brevo`                                | Selects the adapter in `apps/api/src/email/provider.ts`.               |
| `EMAIL_FROM`     | a mailbox confirmed in Brevo → Senders | Brevo refuses the send if this address is not verified there.          |
| `EMAIL_REPLY_TO` | `ovpcasss@buksu.edu.ph`                | Replies reach the office; the sending address above is never read.     |

Setup, once per environment:

1. Brevo → Senders & IP → **Senders**: add the address used in `EMAIL_FROM` and
   click the confirmation link that mailbox receives. No domain, no DKIM/SPF.
2. Brevo → SMTP & API → **API Keys**: create a key.
3. `cd apps/api && npx wrangler secret put EMAIL_API_KEY`, pasting that key — it
   replaces the Resend key in the same secret slot.
4. `npx wrangler deploy`, then send one message and confirm it arrives at the
   recipient itself, not at the sender's mailbox.

There is no redirect switch any more. `EMAIL_REDIRECT_TO` was removed on
2026-10-26: it addressed every message — including each PIC's receipt and every
password-reset link — to one Gmail instead of the person the outbox row named.

**Deliverability.** A verified free mailbox (`gmail.com`) is accepted but is not
authenticated for the university, so some receivers may file it as bulk. Move to
the university address as soon as Resend verifies the domain.

## Acknowledgment receipts to the PIC

Approval renders one OVPCASSS-F-013 per person in charge, stores it in R2, and
mails it to the address on that PIC row (`report_pics.email`) with the PDF
attached. It is no longer gated on the person holding a verified account: a PIC
who never signed in still receives the receipt. A message over the 8 MiB
attachment budget goes out without the file, and its copy says so.

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

Consequences: email/password registration and password reset cannot complete
with the domain sender. Sign-in, reports, reviews, approvals, exports, downloads
and notifications are
unaffected. Google sign-in creates the account already verified, with a
`SUBMITTER` role, so it sidesteps the mail path entirely.

Since 2026-10-26 the Worker sends through Brevo (above) instead of Resend, so
these paths work again and each message reaches its own recipient.

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

## Returning to the university domain

Once `send.buksu.edu.ph` verifies at Resend, edit `apps/api/wrangler.toml`:

```toml
EMAIL_PROVIDER = "resend"
EMAIL_FROM = "OVPCASSS PAR <no-reply@send.buksu.edu.ph>"
EMAIL_REPLY_TO = "ovpcasss@buksu.edu.ph"
```

Then `npx wrangler secret put EMAIL_API_KEY` with the Resend key again, and
redeploy. `EMAIL_FROM` only needs to sit on a domain verified in Resend; it does
not need to exist as a mailbox. Verification links are built from the request
origin, so they keep pointing at the deployed host, not the sender. Re-run the
check in "Verify" after changing it.
