# BanglaBazar 2

Mobile-first reusable e-commerce template for GitHub Pages/Vercel.

## Architecture
- Public product catalog: `data/products.json`
- Product descriptions: `content/*.md`
- Stable product pages: `products/<english-id>.html`
- Firebase Authentication: email/password
- Firebase Firestore user profile: `users/<uid>`
- User cart: `users/<uid>/cart/*`
- User wishlist: `users/<uid>/wishlist/*`
- User orders: `users/<uid>/orders/*`
- GitHub REST API: admin-only publishing from the Admin panel
- GitHub token: never hardcoded; entered in Admin and kept in sessionStorage only
- WhatsApp business number: `01949737370` (`8801949737370` for wa.me)

## Buy Now / WhatsApp order
When a logged-in customer presses **এখনই কিনুন**, the app:
1. Reads the customer's name, phone, address, city, district and email from Firestore.
2. Creates an order record under `users/<uid>/orders`.
3. Builds a WhatsApp message containing customer details, product title, ID, quantity, price and product URL.
4. Opens the customer's WhatsApp chat with `01949737370` using a pre-filled message.

The customer still has to press WhatsApp's **Send** button. A normal `wa.me` link cannot silently send a message from a user's WhatsApp account.

Cart checkout works the same way and includes all cart products.

## Important product URL rule
Always use a stable English Product ID such as:
`islamic-history-1-5`

The public URL becomes:
`/products/islamic-history-1-5.html`

Do not use Bengali product titles as filenames/IDs.

## Firebase setup
1. Enable Email/Password Authentication.
2. Create Firestore Database.
3. Apply `firebase.rules` in the Firebase Console.
4. Firebase config is stored in `js/config.js` as requested. Do not put a GitHub PAT there.

## GitHub Admin
Open `/admin.html`.
- Set an admin password on the device.
- Add GitHub username, repository, PAT and branch.
- Test the connection.
- Publish/update products.

The client-side admin password is only a local UI gate. It is not a server-side security boundary.

## Deployment
Upload the complete folder to GitHub Pages or deploy to Vercel. Keep the `products`, `data`, `content`, `js`, and `assets` paths unchanged.
