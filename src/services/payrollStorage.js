const STORAGE_KEY = "payrollData";
const DEFAULT_TABLE = "payroll_data";

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const table = import.meta.env.VITE_SUPABASE_TABLE || DEFAULT_TABLE;
  const mode = (
    import.meta.env.VITE_PAYROLL_STORAGE_MODE || "supabase"
  ).toLowerCase();

  return {
    url: url?.trim(),
    key: key?.trim(),
    table,
    mode,
    enabled: Boolean(url && key && mode !== "local"),
  };
}

export function getStorageStatus() {
  const config = getSupabaseConfig();
  return {
    mode: config.enabled ? "supabase" : "local",
    configured: config.enabled,
    message: config.enabled
      ? "Payroll data is using shared Supabase storage."
      : "Supabase is not configured, so payroll data is stored locally in this browser.",
  };
}

function readLocalPayrollData() {
  if (typeof window === "undefined") {
    return { employees: [], company: null };
  }

  try {
    const savedData = window.localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return { employees: [], company: null };
    }

    const parsed = JSON.parse(savedData);
    return {
      employees: parsed.employees || [],
      company: parsed.company || null,
    };
  } catch (error) {
    console.warn("Failed to parse saved payrollData from localStorage.", error);
    return { employees: [], company: null };
  }
}

function writeLocalPayrollData(data) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      console.warn(
        "Unable to save payrollData to localStorage: quota exceeded.",
        error,
      );
    } else {
      console.error("Unable to save payrollData to localStorage:", error);
    }
  }
}

export async function loadPayrollData() {
  const { enabled, url, key, table } = getSupabaseConfig();

  if (enabled) {
    try {
      const response = await fetch(
        `${url}/rest/v1/${table}?select=id,data,updated_at&order=updated_at.desc&limit=1`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.data) {
          return rows[0].data;
        }
      } else {
        console.warn(
          "Supabase load failed; falling back to local storage.",
          response.status,
        );
      }
    } catch (error) {
      console.warn(
        "Supabase load failed; falling back to local storage.",
        error,
      );
    }
  }

  return readLocalPayrollData();
}

export async function savePayrollData(data) {
  writeLocalPayrollData(data);

  const { enabled, url, key, table } = getSupabaseConfig();
  if (!enabled) {
    return { source: "local" };
  }

  try {
    const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([
        {
          id: "app",
          data,
          updated_at: new Date().toISOString(),
        },
      ]),
    });

    if (!response.ok) {
      throw new Error(`Supabase save failed (${response.status})`);
    }

    return { source: "supabase" };
  } catch (error) {
    console.warn(
      "Supabase save failed; local storage remains the fallback.",
      error,
    );
    return { source: "local" };
  }
}
