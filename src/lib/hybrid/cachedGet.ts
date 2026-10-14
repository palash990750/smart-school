const CACHE_PREFIX = "smart-school-cache:";

export async function cachedGet<T>(url: string): Promise<T> {
  const key = CACHE_PREFIX + url;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = (await response.json()) as T;

    try {
      localStorage.setItem(key, JSON.stringify({
        savedAt: Date.now(),
        data,
      }));
    } catch {
      // Storage can be unavailable or full.
    }

    return data;
  } catch (error) {
    const saved = localStorage.getItem(key);

    if (saved) {
      const parsed = JSON.parse(saved) as { data: T };
      return parsed.data;
    }

    throw error;
  }
}
