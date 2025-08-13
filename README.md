# Club Reservation Service

A comprehensive reservation system for managing club facilities including bar, mahjong, and poker rooms.

## Features

### 🏪 **Multi-Room Management**
- **Bar Room**: Time-based reservations with party size restrictions
- **Mahjong Room**: Flexible booking system  
- **Poker Room**: Game-based reservations with player management

### 👥 **User Management**
- Authentication via NextAuth.js
- Whitelist-based access control
- Admin and regular user roles
- Phone number verification

### 📅 **Advanced Booking System**
- Real-time availability checking
- Blocked time slots functionality (fixed - entire duration now shows as "未开放")
- Waitlist management
- Automatic conflict resolution

### 📱 **SMS Notifications**
- Automated booking confirmations
- Reminder notifications
- Waitlist updates
- Mac SMS sender integration

### ⚡ **Technical Stack**
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Drizzle ORM
- **Authentication**: NextAuth.js
- **Deployment**: Fly.io ready with Docker

## Recent Updates

### ✅ **Blocked Slots Fix**
- Fixed issue where only start time showed as blocked
- Now entire blocked duration displays as "未开放" (Not Available)
- Updated both backend logic and frontend display
- Improved time range validation

### 🎨 **UI Improvements**
- Updated blocked slot display to show "未开放" in yellow
- Consistent Chinese localization
- Better visual feedback for unavailable slots

## Project Structure

```
club-reservation-service/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── admin/          # Admin dashboard
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   └── [rooms]/        # Room-specific pages
│   ├── components/         # Reusable React components
│   ├── lib/               # Utilities and configurations
│   └── types/             # TypeScript definitions
├── public/                # Static assets
├── scripts/               # Database and deployment scripts
└── drizzle/              # Database migrations
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/haochenhowardyang/club-reservation-service.git
cd club-reservation-service
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Initialize the database:
```bash
npm run db:push
npm run db:seed
```

5. Start development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Environment Variables

```bash
# Database
DATABASE_URL="file:./sqlite.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# SMS Service (Mac SMS Sender)
MAC_SMS_SENDER_URL="http://localhost:3001"
```

## Database Schema

### Core Tables
- **users**: User accounts and profiles
- **reservations**: All booking records
- **blocked_slots**: Admin-controlled unavailable periods
- **poker_games**: Poker game sessions
- **whitelisted_users**: Access control

## API Endpoints

### Public APIs
- `GET /api/reservations/available` - Check availability
- `POST /api/reservations` - Create reservation

### Admin APIs  
- `GET/POST /api/admin/reservations` - Manage reservations
- `GET/POST /api/admin/blocked-slots` - Control blocked periods
- `GET/POST /api/admin/users` - User management

## Deployment

### Docker
```bash
docker build -t club-reservation-service .
docker run -p 3000:3000 club-reservation-service
```

### Fly.io
```bash
flyctl deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
