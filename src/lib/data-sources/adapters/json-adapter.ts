import { promises as fs } from "fs";
import path from "path";
import type { DataSourceAdapter, AudioInput, JSONAdapterConfig } from "../types";
import { parseWhisperJson } from "@/types/whisper";

export class JSONAdapter implements DataSourceAdapter {
  name = "JSON File Adapter";
  type = "json_file" as const;

  private config: JSONAdapterConfig;

  constructor(config: JSONAdapterConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Verify base path exists
    try {
      await fs.access(this.config.basePath);
    } catch {
      throw new Error(`Base path not accessible: ${this.config.basePath}`);
    }
  }

  async fetchSources(): Promise<AudioInput[]> {
    const sources: AudioInput[] = [];
    const files = await this.findFiles(this.config.basePath, this.config.pattern);

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        const { structure } = this.config;

        // Extract fields using dot notation
        const externalId = structure.externalIdField
          ? this.getNestedValue(data, structure.externalIdField)
          : path.basename(filePath, ".json");
        const name = structure.nameField
          ? this.getNestedValue(data, structure.nameField)
          : path.basename(filePath, ".json");
        const audioUrl = this.getNestedValue(data, structure.audioUrlField);
        const whisperData = this.getNestedValue(data, structure.whisperDataField);

        const whisperJson = parseWhisperJson(whisperData);
        if (!whisperJson) {
          console.warn(`Invalid Whisper format in ${filePath}`);
          continue;
        }

        if (!audioUrl) {
          console.warn(`Missing audioUrl in ${filePath}`);
          continue;
        }

        sources.push({
          externalId: String(externalId),
          name: String(name),
          audioUrl: String(audioUrl),
          whisperJson,
        });
      } catch (error) {
        console.warn(`Error processing ${filePath}:`, error);
      }
    }

    return sources;
  }

  async disconnect(): Promise<void> {
    // No-op for file system
  }

  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (pattern.includes("**")) {
          const subFiles = await this.findFiles(fullPath, pattern);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Simple pattern matching (*.json)
        const filePattern = pattern.replace("**", "").replace("/", "");
        if (this.matchPattern(entry.name, filePattern)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private matchPattern(filename: string, pattern: string): boolean {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(filename);
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current, key) => {
      return current && typeof current === "object"
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }
}

// Create adapter from environment variables
export function createJSONAdapterFromEnv(): JSONAdapter | null {
  if (process.env.DATASOURCE_JSON_ENABLED !== "true") {
    return null;
  }

  const config: JSONAdapterConfig = {
    basePath: process.env.DATASOURCE_JSON_PATH || "./data",
    pattern: process.env.DATASOURCE_JSON_PATTERN || "*.json",
    structure: {
      externalIdField: process.env.DATASOURCE_JSON_FIELD_ID,
      nameField: process.env.DATASOURCE_JSON_FIELD_NAME,
      audioUrlField: process.env.DATASOURCE_JSON_FIELD_AUDIO || "audio_url",
      whisperDataField: process.env.DATASOURCE_JSON_FIELD_WHISPER || "whisper",
    },
  };

  return new JSONAdapter(config);
}
