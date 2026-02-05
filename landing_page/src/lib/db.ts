
import { sql } from "bun";

export async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS waiting_list (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        interest VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Don't throw here to allow app to start even if DB is not ready yet
  }
}

export async function addToWaitingList(data: {
  email: string;
  name: string;
  interest?: string;
  message?: string;
}) {
  try {
    const [result] = await sql`
      INSERT INTO waiting_list (email, name, interest, message)
      VALUES (${data.email}, ${data.name}, ${data.interest || null}, ${data.message || null})
      RETURNING id, email, name, created_at
    `;
    return result;
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error("Email already registered");
    }
    throw error;
  }
}
