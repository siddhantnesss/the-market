# The People's Market

Build the first working version of a web app called “The Market”. Core concept: a simple online commercial market where people can enter with just their name and participate in one common public market chat. Reading is free. Every public message sent costs ₹1. Every private message sent costs ₹5. The sender pays; receiving is free. Keep the rules extremely simple and mechanical—no judging whether a message is meaningful. Start with a beautiful but radically simple, confident interface, mobile-first, designed for Indian users. The landing/entry screen should prominently say “THE MARKET” and explain: “See. Free. Speak publicly. ₹1/message. Talk privately. ₹5/message.” Entry should ask only for name. After entry, show the public market chat, message composer, visible ₹1/message price, current balance/credits, and a clear way to start a private chat with another participant at ₹5/message. For this prototype, use mock/demo balance and data so the experience works end-to-end without requiring payment integration yet. Include realistic sample market conversations around sourcing/manufacturing/wholesale, but make clear they are demo messages. Allow users to click a participant and open a private chat. Private chat should visibly show ₹5/message. Make the visual language feel like an actual market rather than a generic SaaS dashboard: typography-led, lots of whitespace, minimal UI, no gradients, no excessive cards, no corporate jargon. The long-term idea is that the network is the product. Do not add unnecessary signup, categories, profiles, or complicated onboarding. Build the app so the pricing rules and chat structure can later be connected to a real backend/payment system.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://the-market.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7075eb7-5857-4022-b885-0e583f612175).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
