#!/usr/bin/env node

/**
 * Migration script to add page_layout column to approval_types table
 * Run this after pulling the latest code: npm run migrate
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL in backend/.env (see backend/.env.example)");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

async function run() {
  try {
    await client.connect();
    console.log(
      "Running migration: Add page_layout column to approval_types...",
    );

    // Read and execute the migration
    const migration = readFileSync(
      join(__dirname, "../sql/add-page-layout.sql"),
      "utf8",
    );
    await client.query(migration);

    console.log("✓ Migration completed successfully!");
    console.log(
      "✓ page_layout column added to approval_types table (or already exists)",
    );
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
