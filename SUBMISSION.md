# Bounty submission kit

## 1. Live URL
`https://<your-domain>.whop.site` (or your whop.app address). Paste the URL after `whop apps deploy`.

## 2. Source code
Push this folder to a GitHub repo, or zip it without `node_modules` and `dist`.

## 3. Screen recording script (3–5 min)

| Time | Show |
| --- | --- |
| 0:00 | Open the live URL with `?debug=1`. Scroll the homepage on desktop: hero, services, pricing, financing, service area, reviews. Point out the **`service_viewed`** events appearing in the pixel log and in DevTools → Network (`t.whop.tw`). |
| 0:40 | Switch DevTools to a phone size to show the responsive layout. |
| 1:00 | **Estimate form**: submit a request. Show the **`estimate_requested`** event, then the Whop dashboard → Members / People showing the new lead with the note. |
| 1:45 | **Inspection checkout**: click "Book inspection". Show the ExpressCheckoutElement on top and the CheckoutElement below. Pay with a test card. Show the success message and the payment in the dashboard. |
| 2:30 | **Deposit**: click "Pay deposit". Show **`deposit_started`** and the PaymentElement with BrandingElement. Pay with 4242… and show the success screen with the saved card (`payt_…`) and the deposit invoice. |
| 3:15 | Click "Crew view: bill the final balance". Enter the admin key and click "Find saved cards". Enter $11,900 → **Auto-charge** and show it **paid**. Then show **Send for manual payment** and open the invoice checkout link. |
| 4:15 | Whop dashboard: Invoices list and the pixel/Websites events (`service_viewed`, `estimate_requested`, `deposit_started`). |

## 4. Whop features paragraph (paste as-is)

Built on Whop Websites (Vite + React, packed with `@whop/cli/vite` and deployed with `whop apps deploy` to a whop.site/whop.app domain). Server code calls the Whop REST API through the hosting proxy, so no API key is stored. Three one-time plans (a $149 inspection, a $500 project deposit and a $1,450 flat-rate gutter service) are created with the Products and Variants APIs. Checkout uses Whop Payment Elements only. The inspection and flat-rate service use CheckoutElement plus ExpressCheckoutElement (Apple Pay / Google Pay / PayPal), so Whop's financing options such as Klarna, Afterpay and Splitit surface automatically. The deposit uses PaymentElement with the required BrandingElement in setup mode: its confirmation token creates a Setup Intent that stores the card on file, with 3DS handled by `handleNextAction`. The deposit is then billed to that card with the Invoices API. A `/crew` dashboard lists the customer's saved payment methods (Payment Methods API) and bills the final balance with the Invoices API, either auto-charged to the stored card (`/issue`) or emailed for manual payment with a Whop checkout link (`/send`). The "Request an Estimate" form creates a lead on the account: a Member record with a note holding the request details, plus a server-side `lead` event through the Events API. The site fires custom pixel events with `whop.track` (`service_viewed`, `estimate_requested`, `deposit_started`) alongside `initiate_checkout` and the automatic page and checkout events. Everything brand-specific lives in one config file, so the template can be re-skinned for any roofer.
