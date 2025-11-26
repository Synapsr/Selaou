import mysql from "mysql2/promise";
import type { DataSourceAdapter, AudioInput, SQLAdapterConfig } from "../types";
import { parseWhisperJson } from "@/types/whisper";

export class SQLAdapter implements DataSourceAdapter {
  name = "SQL Adapter";
  type = "sql" as const;

  private config: SQLAdapterConfig;
  private connection: mysql.Connection | null = null;

  constructor(config: SQLAdapterConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
  }

  async fetchSources(): Promise<AudioInput[]> {
    if (!this.connection) {
      throw new Error("Not connected. Call connect() first.");
    }

    const [rows] = await this.connection.execute(this.config.query);

    if (!Array.isArray(rows)) {
      return [];
    }

    const sources: AudioInput[] = [];
    const { columnMapping } = this.config;

    for (const row of rows as Record<string, unknown>[]) {
      const externalId = String(row[columnMapping.externalId] || "");
      const name = String(row[columnMapping.name] || "");
      const audioUrl = String(row[columnMapping.audioUrl] || "");

      // Parse whisper JSON
      let whisperData = row[columnMapping.whisperJson];
      if (typeof whisperData === "string") {
        try {
          whisperData = JSON.parse(whisperData);
        } catch {
          console.warn(`Invalid JSON for source ${externalId}`);
          continue;
        }
      }

      const whisperJson = parseWhisperJson(whisperData);
      if (!whisperJson) {
        console.warn(`Invalid Whisper format for source ${externalId}`);
        continue;
      }

      if (!externalId || !audioUrl) {
        console.warn(`Missing required fields for source`);
        continue;
      }

      sources.push({
        externalId,
        name: name || `Source ${externalId}`,
        audioUrl,
        whisperJson,
      });
    }

    return sources;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

// Create adapter from environment variables
export function createSQLAdapterFromEnv(): SQLAdapter | null {
  if (process.env.DATASOURCE_SQL_ENABLED !== "true") {
    return null;
  }

  const config: SQLAdapterConfig = {
    host: process.env.DATASOURCE_SQL_HOST || "localhost",
    port: parseInt(process.env.DATASOURCE_SQL_PORT || "3306", 10),
    database: process.env.DATASOURCE_SQL_DATABASE || "",
    user: process.env.DATASOURCE_SQL_USER || "",
    password: process.env.DATASOURCE_SQL_PASSWORD || "",
    query: process.env.DATASOURCE_SQL_QUERY || "",
    columnMapping: {
      externalId: process.env.DATASOURCE_SQL_COL_ID || "id",
      name: process.env.DATASOURCE_SQL_COL_NAME || "name",
      audioUrl: process.env.DATASOURCE_SQL_COL_AUDIO || "audio_url",
      whisperJson: process.env.DATASOURCE_SQL_COL_WHISPER || "whisper_json",
    },
  };

  if (!config.database || !config.query) {
    console.warn("SQL adapter enabled but missing database or query");
    return null;
  }

  return new SQLAdapter(config);
}
