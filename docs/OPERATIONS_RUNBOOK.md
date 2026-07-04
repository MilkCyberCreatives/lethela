# Lethela Operating Runbook

This runbook is for the owner/admin team before taking real customer traffic.

## Operating Gates

Controlled pilot minimum:

- 1 approved vendor with a complete profile
- 5 approved live products or menu items
- 1 approved rider
- 1 successful low-value paid Ozow proof order
- WhatsApp support monitored during operating hours

Public marketing minimum:

- 3 approved vendors
- 20 approved live products or menu items
- 2 approved riders
- 5 successful paid proof orders
- Real vendor/product photos loaded
- Sentry and Pusher configured for production monitoring and realtime updates

## Vendor Approval SOP

Approve a vendor only when these are complete:

- Store type, township, municipality, province and address
- Trading hours
- Category and products/menu
- Delivery radius and delivery fee
- Banking details
- Owner documents
- Phone or WhatsApp contact

If anything is missing, request changes instead of approving.

## Rider Approval SOP

Approve a rider only when these are complete:

- Full name, email and phone/WhatsApp
- ID last four digits and licence code where required
- Vehicle type and registration where applicable
- Primary operating area
- Available hours
- Emergency contact
- Smartphone and bank account confirmation

## Test Order SOP

Run a low-value real order before opening traffic:

1. Customer adds item to cart.
2. Customer pays with Ozow live mode.
3. Ozow callback marks the order paid.
4. Vendor receives the order alert.
5. Admin can see the order in the dashboard.
6. Rider is assigned or manually coordinated.
7. Customer receives status/support updates.
8. Order is completed and reconciled.

## Refund And Complaint SOP

For every complaint, capture:

- Order reference
- Customer phone number
- Vendor name
- Rider name if assigned
- Payment reference
- Photos where useful
- Resolution: replacement, credit, partial refund, full refund or rejected claim

Refunds must be matched to the payment reference before action.

## Alcohol SOP

Alcohol must stay hidden until these are implemented and verified:

- Vendor licence checks
- Customer age verification
- Rider handover rules
- Refusal handling
- Refund logic for failed verification or unsafe handover

## Monitoring

Minimum monitoring before scale:

- Sentry DSN in production
- Pusher server and browser keys
- Owner WhatsApp/email notifications
- Daily check of `/admin/launch-checklist`
- Vercel error log review after deploys
