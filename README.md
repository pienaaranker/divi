# Divi - Turn-Based Item Selection App

Divi is a web application for turn-based item selection, useful for scenarios like dividing an inheritance among several people.

## Features

- Create, edit, and delete items
- Turn-based picking system
- No user registration required - just enter your name
- Shareable links for inviting participants
- Persistent game state using Firebase
- Mobile and desktop responsive design

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
4. Enable Firestore database in your Firebase project
5. Copy the `.env.example` file to `.env` and add your Firebase configuration values
6. Start the development server: `npm run dev`

## Firebase Setup

1. Go to the Firebase Console and create a new project
2. Add a web app to your project
3. Enable Firestore Database (start in test mode)
4. Copy your Firebase config values to the `.env` file
5. Security rules for Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write;
    }
  }
}
```

## Development

- Run development server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Usage

1. Create a new game and add items
2. Add participants who will take turns
3. Share the game link with all participants
4. Take turns selecting items until everything is picked

## Technologies Used

- SvelteKit
- Firebase/Firestore
- TypeScript
- TailwindCSS

## License

MIT