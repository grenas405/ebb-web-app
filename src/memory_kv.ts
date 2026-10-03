/**
 * memory_kv.ts — In-process stand-in for Deno KV.
 *
 * Used only when no real KV database is available (e.g. a Deno Deploy app with
 * no KV database attached), so the site still boots and serves every page.
 * It implements just the slice of the Deno.Kv API this app uses. Data lives in
 * memory and is lost whenever the instance restarts — attach a real database
 * for durable leads.
 */

type Key = Deno.KvKey;
type Part = Deno.KvKeyPart;

interface Row {
  readonly key: Key;
  readonly value: unknown;
  readonly versionstamp: string;
  readonly expiresAt: number | null;
}

/** Deno KV orders key parts by type first, then by value. */
const TYPE_ORDER = ["object", "string", "number", "bigint", "boolean"];

function comparePart(a: Part, b: Part): number {
  const ta = TYPE_ORDER.indexOf(typeof a);
  const tb = TYPE_ORDER.indexOf(typeof b);
  if (ta !== tb) return ta - tb;
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }
  type Scalar = string | number | bigint | boolean;
  const [x, y] = [a as Scalar, b as Scalar];
  return x < y ? -1 : x > y ? 1 : 0;
}

function compareKey(a: Key, b: Key): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = comparePart(a[i], b[i]);
    if (c !== 0) return c;
  }
  return a.length - b.length;
}

const encode = (key: Key): string =>
  JSON.stringify(key, (_k, v) => typeof v === "bigint" ? `${v}n` : v);

/** Copy plain values so callers can't mutate stored state; KvU64 is immutable. */
const copy = <T>(v: T): T => v instanceof Deno.KvU64 ? v : structuredClone(v);

class MemoryAtomic {
  readonly #ops: Array<(kv: MemoryKv) => void> = [];
  constructor(private readonly kv: MemoryKv) {}

  set(key: Key, value: unknown, options?: { expireIn?: number }): this {
    this.#ops.push((kv) => kv.write(key, value, options?.expireIn));
    return this;
  }

  sum(key: Key, n: bigint): this {
    return this.mutate({ type: "sum", key, value: new Deno.KvU64(n) });
  }

  mutate(...mutations: Array<{ type: string; key: Key; value?: unknown }>): this {
    for (const m of mutations) {
      if (m.type !== "sum") throw new Error(`memory KV: unsupported mutation "${m.type}"`);
      this.#ops.push((kv) => {
        const current = kv.read(m.key)?.value;
        const base = current instanceof Deno.KvU64 ? current.value : 0n;
        const add = (m.value as Deno.KvU64).value;
        // Deno KV sums wrap around at 2^64.
        kv.write(m.key, new Deno.KvU64((base + add) % (1n << 64n)));
      });
    }
    return this;
  }

  commit(): Promise<Deno.KvCommitResult> {
    for (const op of this.#ops) op(this.kv);
    return Promise.resolve({ ok: true, versionstamp: this.kv.stamp() });
  }
}

class MemoryKv {
  readonly #rows = new Map<string, Row>();
  #version = 0;

  stamp(): string {
    return (++this.#version).toString(16).padStart(20, "0");
  }

  read(key: Key): Row | undefined {
    const id = encode(key);
    const row = this.#rows.get(id);
    if (row && row.expiresAt !== null && row.expiresAt <= Date.now()) {
      this.#rows.delete(id);
      return undefined;
    }
    return row;
  }

  write(key: Key, value: unknown, expireIn?: number): string {
    const versionstamp = this.stamp();
    const expiresAt = expireIn ? Date.now() + expireIn : null;
    this.#rows.set(encode(key), { key: [...key], value: copy(value), versionstamp, expiresAt });
    return versionstamp;
  }

  #entry<T>(key: Key): Deno.KvEntryMaybe<T> {
    const row = this.read(key);
    return row
      ? { key, value: copy(row.value) as T, versionstamp: row.versionstamp }
      : { key, value: null, versionstamp: null };
  }

  get<T>(key: Key): Promise<Deno.KvEntryMaybe<T>> {
    return Promise.resolve(this.#entry<T>(key));
  }

  getMany<T extends readonly unknown[]>(keys: readonly Key[]): Promise<unknown> {
    return Promise.resolve(keys.map((k) => this.#entry(k)) as unknown as T);
  }

  set(key: Key, value: unknown, options?: { expireIn?: number }): Promise<Deno.KvCommitResult> {
    return Promise.resolve({ ok: true, versionstamp: this.write(key, value, options?.expireIn) });
  }

  async *list<T>(
    selector: { prefix: Key },
    options: { reverse?: boolean; limit?: number } = {},
  ): AsyncGenerator<Deno.KvEntry<T>> {
    const { prefix } = selector;
    const matches = [...this.#rows.values()]
      .filter((r) =>
        this.read(r.key) &&
        prefix.every((p, i) => r.key.length > i && comparePart(r.key[i], p) === 0)
      )
      .sort((a, b) => compareKey(a.key, b.key));
    if (options.reverse) matches.reverse();
    for (const r of matches.slice(0, options.limit ?? Infinity)) {
      yield { key: r.key, value: copy(r.value) as T, versionstamp: r.versionstamp };
    }
  }

  atomic(): MemoryAtomic {
    return new MemoryAtomic(this);
  }

  close(): void {}
}

/** Create an empty in-memory store typed as Deno.Kv for the rest of the app. */
export function openMemoryKv(): Deno.Kv {
  return new MemoryKv() as unknown as Deno.Kv;
}
