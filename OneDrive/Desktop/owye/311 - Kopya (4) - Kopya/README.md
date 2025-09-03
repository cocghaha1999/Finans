# Costik Finans - Personal Finance Management App

A modern personal finance management application built with Next.js, React, and Firebase.

## Features

- 💰 Transaction tracking and management
- 📊 Financial analytics and reports
- 🏦 Multiple bank account support
- 📱 Progressive Web App (PWA) support
- 🔒 Secure authentication with Firebase
- 📋 Budget management
- 🔔 Smart notifications
- 📱 Mobile-first responsive design
- ⚡ Offline support
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Firebase (Firestore, Auth)
- **PWA**: next-pwa
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cocghaha1999/Finans.git
cd Finans
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file with your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This app is optimized for deployment on:
- **Render** (recommended)
- Vercel
- Netlify
- Any Node.js hosting platform

### Deploy to Render

1. Connect your GitHub repository to Render
2. Set the build command: `npm install && npm run build`
3. Set the start command: `npm start`
4. Add your environment variables in Render dashboard

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── budgets/           # Budget management pages
│   ├── kartlarim/         # Cards/accounts pages
│   ├── login/             # Authentication pages
│   ├── notifications/     # Notifications pages
│   ├── odemeler/         # Payments/transactions pages
│   └── offline/          # Offline pages
├── components/            # Reusable React components
│   └── ui/               # UI components library
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries and configurations
├── public/               # Static assets
├── styles/               # Global styles
└── types/                # TypeScript type definitions
```

## Features Overview

### Transaction Management
- Add, edit, and delete transactions
- Categorize expenses and income
- Swipe gestures for quick actions
- Transaction search and filtering

### Budget Tracking
- Set monthly/yearly budgets
- Track spending against budgets
- Visual progress indicators
- Budget alerts and notifications

### Analytics & Reports
- Interactive charts and graphs
- Monthly/yearly financial summaries
- Category-wise spending analysis
- Income vs expense tracking

### PWA Features
- Installable on mobile devices
- Offline functionality
- Push notifications
- Background sync

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support, email support@costikfinans.com or create an issue in the repository.
