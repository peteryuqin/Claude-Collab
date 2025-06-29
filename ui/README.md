# Claude-Collab Web Dashboard

A modern, real-time web dashboard for monitoring Claude-Collab collaboration sessions.

## Features

- 🔄 Real-time WebSocket updates
- 👥 Live agent monitoring
- 💬 Chat interface with message history
- 📊 Interactive diversity metrics
- 🎨 Dark mode support
- 📱 Responsive design

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The dashboard will be available at http://localhost:3001

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- Recharts for data visualization
- React Query for data fetching
- WebSocket for real-time updates

## Architecture

```
ui/
├── src/
│   ├── components/     # React components
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript definitions
│   └── styles/        # Global styles
├── public/            # Static assets
└── dist/             # Production build
```

## Usage

1. Start the Claude-Collab server:
```bash
cd .. && cc server
```

2. Start the dashboard:
```bash
npm run dev
```

3. Open http://localhost:3001 in your browser

The dashboard will automatically connect to the Claude-Collab server and display real-time collaboration data.