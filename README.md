# Weekly Calendar with Recurring Events

A custom weekly calendar application that supports recurring events, similar to Google Calendar.

## Features

- Weekly view calendar with days displayed horizontally and time slots vertically
- Event management with recurring support (None, Daily, Weekly)
- Color-coded events (Work: blue, Personal: green, Meeting: orange)
- Drag-and-drop functionality for moving events
- Timezone support
- Recurrence exceptions (remove or reschedule a single occurrence)
- Conflict detection (prevent double booking)

## Recurrence Logic

The application implements recurrence logic from scratch:

- **None**: One-time events that do not repeat
- **Daily**: Events that repeat every day
- **Weekly**: Events that repeat on specific days of the week (e.g., every Monday and Wednesday)

Recurrence exceptions allow users to:
- Delete a single occurrence of a recurring event
- Reschedule a single occurrence to a different time

The recurrence logic is implemented in the `generateRecurringEventOccurrences` method in the `EventService` class. It generates all occurrences of a recurring event within a specified date range, taking into account any exceptions.

## Project Structure

- `client/`: Frontend React application
- `server/`: Backend Express.js API
- `docker-compose.yml`: Docker configuration for running the application

## Technologies Used

- **Frontend**: React, TypeScript, Redux Toolkit
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd weekly-calendar-app
   ```

2. Install dependencies:
   ```
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `server` directory with the following content:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar
   JWT_SECRET=your_jwt_secret
   PORT=3001
   ```

### Running the Application

#### Using Docker (Recommended)

1. Start the application using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Access the application at http://localhost:3000

#### Without Docker

1. Start the PostgreSQL database:
   ```
   # You can use Docker for just the database
   docker-compose up -d db
   ```

2. Run database migrations:
   ```
   cd server
   npx prisma migrate deploy
   ```

3. Start the backend server:
   ```
   cd server
   npm run dev
   ```

4. Start the frontend development server:
   ```
   cd client
   npm start
   ```

5. Access the application at http://localhost:3000

## API Endpoints

- `GET /api/events`: Get events for a week view
- `POST /api/events`: Create a new event
- `PUT /api/events/:id`: Update an existing event
- `DELETE /api/events/:id`: Delete an event
- `POST /api/events/:eventId/exceptions`: Create an exception for a recurring event occurrence

## License

This project is licensed under the MIT License.
