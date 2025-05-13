import { Request, Response } from 'express';
import prisma from '../prismaClient';

export class UserController {
  /**
   * Create a new user
   */
  async createUser(req: Request, res: Response) {
    try {
      const { name, email } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create the user
      const user = await prisma.user.create({
        data: {
          name,
          email,
        },
      });

      return res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  /**
   * Get all users
   */
  async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      return res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      return res.status(500).json({ error: 'Failed to get users' });
    }
  }

  /**
   * Get a user by ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Update a user
   */
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          updatedAt: true,
        },
      });

      return res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Delete the user
      await prisma.user.delete({
        where: { id },
      });

      return res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }
}
