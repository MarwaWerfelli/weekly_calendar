import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventRoutes from './routes/eventRoutes';
import { setupSwagger } from './swagger';

dotenv.config();

const app: Express = express();

app.use(cors()); // Configure CORS appropriately for production
app.use(express.json());

app.get('/', (_: Request, res: Response) => {
  res.send('Weekly Calendar API');
});

app.use('/api/events', eventRoutes);

// Setup Swagger documentation
setupSwagger(app);

// Basic Error Handler
app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ message: err.message || 'Something broke!' });
});

export default app;
