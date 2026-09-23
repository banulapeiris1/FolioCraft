import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/database";
import { authRoutes } from "./routes/auth.routes";
import { portfolioRoutes } from "./routes/portfolio.routes";
import { projectRoutes } from "./routes/project.routes";
import { skillRoutes } from "./routes/skill.routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => {
  res.json({
    message: "FolioCraft API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/skills", skillRoutes);

app.use(errorHandler);


const isTest =
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("--test"));

if (!isTest) {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    try {
      await pool.query("SELECT NOW()");
      console.log("PostgreSQL connected successfully");
    } catch (error) {
      console.error("PostgreSQL connection failed:", error);
    }
  });
}