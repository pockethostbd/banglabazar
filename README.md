# BanglaBazar

A reusable mobile-first e-commerce template using:

- Vercel/static hosting
- Firebase Authentication + Firestore for users
- GitHub REST API from the Admin Panel using credentials entered by the admin
- External image URLs
- YouTube video URLs
- Markdown product descriptions
- Real product pages at `/products/product-slug.html`

## Setup

1. Deploy this repository to Vercel or GitHub Pages.
2. Enable Email/Password Authentication in Firebase.
3. Create a Firestore database.
4. Update Firestore rules from `firebase.rules`.
5. Open `/admin.html`.
6. Enter:
   - GitHub username
   - Repository name
   - GitHub Personal Access Token
   - Admin password
7. The Admin Panel stores the GitHub credentials only in the current browser session. They are not in source code.
8. In Settings, configure the store name/logo/theme and save them to GitHub.

## GitHub token

Use a fine-grained Personal Access Token with access only to the selected repository and Contents read/write permission. Never commit the token to this repository.

## Product storage

The Admin Panel creates:

- `products/<slug>.html`
- `data/products.json`
- `content/<slug>.md`

The product HTML is a real static page and uses the shared store shell.

## Important

Firebase web configuration values are normally public client configuration. Security must be enforced by Firebase Authentication and Firestore Security Rules, not by hiding the web config.
