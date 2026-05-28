export const API_BASE = "https://n8n.oleksandr.ceo/webhook/v1/qa";

export interface QARecord {
  id: string;
  question: string;
  answer: string;
  createdAt?: string;
  updatedAt?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeader(creds: string): HeadersInit {
  return {
    Authorization: `Basic ${creds}`,
    "Content-Type": "application/json",
  };
}

async function handle(res: Response): Promise<unknown> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(text || `Request failed (${res.status})`, res.status);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalize(raw: unknown): QARecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id ?? r._id ?? r.ID;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    question: typeof r.question === "string" ? r.question : "",
    answer: typeof r.answer === "string" ? r.answer : "",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : (typeof r.created_at === "string" ? r.created_at : undefined),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : (typeof r.updated_at === "string" ? r.updated_at : undefined),
  };
}

function normalizeList(raw: unknown): QARecord[] {
  if (Array.isArray(raw)) {
    return raw.map(normalize).filter((x): x is QARecord => x !== null);
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) return normalizeList(r.data);
    if (Array.isArray(r.items)) return normalizeList(r.items);
    if (Array.isArray(r.records)) return normalizeList(r.records);
    const single = normalize(raw);
    return single ? [single] : [];
  }
  return [];
}

export const api = {
  async ping(creds: string): Promise<void> {
    const res = await fetch(`${API_BASE}/`, { headers: authHeader(creds) });
    await handle(res);
  },
  async list(creds: string): Promise<QARecord[]> {
    const res = await fetch(`${API_BASE}/`, { headers: authHeader(creds) });
    return normalizeList(await handle(res));
  },
  async get(creds: string, id: string): Promise<QARecord> {
    const res = await fetch(`${API_BASE}/?id=${encodeURIComponent(id)}`, { headers: authHeader(creds) });
    const raw = await handle(res);
    const rec = Array.isArray(raw) ? normalize(raw[0]) : normalize(raw);
    if (!rec) throw new ApiError("Record not found", 404);
    return rec;
  },
  async create(creds: string, data: { question: string; answer: string }): Promise<QARecord | null> {
    const res = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: authHeader(creds),
      body: JSON.stringify(data),
    });
    return normalize(await handle(res));
  },
  async update(creds: string, data: { id: string; question: string; answer: string }): Promise<QARecord | null> {
    const res = await fetch(`${API_BASE}/update`, {
      method: "PATCH",
      headers: authHeader(creds),
      body: JSON.stringify(data),
    });
    return normalize(await handle(res));
  },
  async remove(creds: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/delete?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeader(creds),
    });
    await handle(res);
  },
};
