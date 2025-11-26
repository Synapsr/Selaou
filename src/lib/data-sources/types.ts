import type { WhisperOutput } from "@/types/whisper";

// Input format for audio sources
export interface AudioInput {
  externalId: string;
  name: string;
  audioUrl: string;
  sourceUrl?: string; // Optional URL to the original source (podcast page, etc.)
  whisperJson: WhisperOutput;
}

// Base adapter interface
export interface DataSourceAdapter {
  name: string;
  type: "sql" | "json_file" | "api";

  connect(): Promise<void>;
  fetchSources(): Promise<AudioInput[]>;
  disconnect(): Promise<void>;
}

// SQL Adapter configuration
export interface SQLAdapterConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  query: string;
  columnMapping: {
    externalId: string;
    name: string;
    audioUrl: string;
    whisperJson: string;
  };
}

// JSON File Adapter configuration
export interface JSONAdapterConfig {
  basePath: string;
  pattern: string;
  structure: {
    externalIdField?: string;
    nameField?: string;
    audioUrlField: string;
    whisperDataField: string;
  };
}

// API Adapter configuration
export interface APIAdapterConfig {
  baseUrl: string;
  authType: "none" | "bearer" | "api_key";
  authConfig?: {
    token?: string;
    headerName?: string;
  };
  endpoints: {
    list: string;
    details?: string;
  };
  responseMapping: {
    externalId: string;
    name: string;
    audioUrl: string;
    whisperJson: string;
  };
}
