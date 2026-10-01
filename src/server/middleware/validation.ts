import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

/**
 * Express middleware to validate request body against a Zod schema.
 */
export function validateBody(schema: ZodObject<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // parseAsync automatically strips unexpected fields if the schema doesn't allow them
      // (Zod strips unknown keys by default)
      const validatedData = await schema.parseAsync(req.body);
      
      // Replace the request body with the validated and stripped data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation Error",
          details: error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }
      return res.status(500).json({ error: "Internal Server Error during validation" });
    }
  };
}
