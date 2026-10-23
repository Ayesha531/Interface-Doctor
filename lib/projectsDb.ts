/**
 * Server-side project persistence in Postgres.
 *
 * Projects are scoped to an anonymous client token stored in an httpOnly
 * cookie. There is no user authentication; the token lets a browser revisit
 * its own projects without exposing anyone else's data.
 */

import { getPool } from "@/lib/db";
import type { AnalyzeResult, RedesignResult, ScreenshotSelection } from "@/lib/types";

export interface PersistedProject {
  id: string;
  name: string;
  source: "upload" | "sample";
  thumbnail: string | null;
  width: number;
  height: number;
  screenshot: ScreenshotSelection;
  findings: AnalyzeResult | null;
  redesign: RedesignResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  clientToken: string;
  name: string;
  source: "upload" | "sample";
  screenshot: ScreenshotSelection;
  thumbnail: string;
}

export interface UpdateProjectInput {
  findings?: AnalyzeResult | null;
  redesign?: RedesignResult | null;
  thumbnail?: string;
}

const LIST_SQL = `
  select id, name, source, screenshot_width, screenshot_height, thumbnail_data_url, findings_json, redesign_json, created_at, updated_at
  from projects
  where client_token = $1
  order by created_at desc
  limit $2
`;

const INSERT_SQL = `
  insert into projects (
    client_token, name, source, screenshot_data_url, screenshot_mime_type,
    screenshot_width, screenshot_height, screenshot_size_bytes, thumbnail_data_url
  ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  returning id, created_at, updated_at
`;

const SELECT_SQL = `
  select id, name, source, screenshot_data_url, screenshot_mime_type, screenshot_width,
    screenshot_height, screenshot_size_bytes, thumbnail_data_url, findings_json, redesign_json,
    created_at, updated_at
  from projects
  where id = $1 and client_token = $2
`;

const UPDATE_SQL = `
  update projects
  set findings_json = coalesce($3, findings_json),
      redesign_json = coalesce($4, redesign_json),
      thumbnail_data_url = coalesce($5, thumbnail_data_url),
      updated_at = now()
  where id = $1 and client_token = $2
  returning id, updated_at
`;

const DELETE_SQL = `
  delete from projects
  where id = $1 and client_token = $2
  returning id
`;

export async function listProjects(
  clientToken: string,
  limit = 20,
): Promise<PersistedProject[]> {
  const pool = getPool();
  if (!pool) return [];

  const result = await pool.query(LIST_SQL, [clientToken, limit]);
  return result.rows.map(rowToProject);
}

export async function createProject(
  input: CreateProjectInput,
): Promise<PersistedProject | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(INSERT_SQL, [
    input.clientToken,
    input.name,
    input.source,
    input.screenshot.dataUrl,
    input.screenshot.mimeType,
    input.screenshot.width,
    input.screenshot.height,
    input.screenshot.sizeBytes,
    input.thumbnail,
  ]);

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: input.name,
    source: input.source,
    width: input.screenshot.width,
    height: input.screenshot.height,
    thumbnail: input.thumbnail,
    screenshot: input.screenshot,
    findings: null,
    redesign: null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getProject(
  id: string,
  clientToken: string,
): Promise<PersistedProject | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(SELECT_SQL, [id, clientToken]);
  if (result.rows.length === 0) return null;
  return rowToProject(result.rows[0]);
}

export async function updateProject(
  id: string,
  clientToken: string,
  input: UpdateProjectInput,
): Promise<PersistedProject | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(UPDATE_SQL, [
    id,
    clientToken,
    input.findings === undefined ? undefined : JSON.stringify(input.findings),
    input.redesign === undefined ? undefined : JSON.stringify(input.redesign),
    input.thumbnail,
  ]);

  if (result.rows.length === 0) return null;
  return getProject(id, clientToken);
}

export async function deleteProject(
  id: string,
  clientToken: string,
): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  const result = await pool.query(DELETE_SQL, [id, clientToken]);
  return result.rowCount !== null && result.rowCount > 0;
}

function rowToProject(row: Record<string, unknown>): PersistedProject {
  const screenshot: ScreenshotSelection = {
    previewUrl: String(row.screenshot_data_url),
    dataUrl: String(row.screenshot_data_url),
    name: String(row.name),
    mimeType: String(row.screenshot_mime_type),
    width: Number(row.screenshot_width),
    height: Number(row.screenshot_height),
    sizeBytes: Number(row.screenshot_size_bytes),
    source: row.source === "sample" ? "sample" : "upload",
  };

  return {
    id: String(row.id),
    name: String(row.name),
    source: row.source === "sample" ? "sample" : "upload",
    width: Number(row.screenshot_width),
    height: Number(row.screenshot_height),
    thumbnail: row.thumbnail_data_url ? String(row.thumbnail_data_url) : null,
    screenshot,
    findings: parseJson<AnalyzeResult>(row.findings_json),
    redesign: parseJson<RedesignResult>(row.redesign_json),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function parseJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}
