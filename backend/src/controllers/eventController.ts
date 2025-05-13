import { Request, Response } from "express";

export const placeholder = (req: Request, res: Response) => {
  res.send("OK");
};
