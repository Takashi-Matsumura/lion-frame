"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EmployeeResult {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  department: { name: string } | null;
  section: { name: string } | null;
}

interface SelectedEmployee {
  id: string;
  employeeId: string;
  name: string;
  nameKana: string | null;
  department: string;
}

export function EmployeePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: unknown) => void;
  language: "en" | "ja";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SelectedEmployee | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期値がある場合に社員情報を復元
  useEffect(() => {
    if (!value || selected) return;
    try {
      const parsed = JSON.parse(value);
      if (parsed?.id) {
        setSelected(parsed);
      }
    } catch {
      // value が JSON でない場合（旧形式の ID）— APIで取得
      if (value && value !== "") {
        fetch(`/api/organization/employees?search=${encodeURIComponent(value)}&limit=1`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            const emp = data?.employees?.[0];
            if (emp && (emp.id === value || emp.employeeId === value)) {
              const sel: SelectedEmployee = {
                id: emp.id,
                employeeId: emp.employeeId,
                name: emp.name,
                nameKana: emp.nameKana,
                department: [emp.department?.name, emp.section?.name].filter(Boolean).join(" / "),
              };
              setSelected(sel);
            }
          })
          .catch(() => {});
      }
    }
  }, [value, selected]);

  const search = useCallback(async (q: string) => {
    if (q.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/organization/employees?search=${encodeURIComponent(q)}&limit=8`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.employees ?? []);
      setShowDropdown(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const selectEmployee = (emp: EmployeeResult) => {
    const sel: SelectedEmployee = {
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      nameKana: emp.nameKana,
      department: [emp.department?.name, emp.section?.name].filter(Boolean).join(" / "),
    };
    setSelected(sel);
    onChange(JSON.stringify(sel));
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelected(null);
    onChange("");
    setQuery("");
  };

  // クリック外で閉じる
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  if (selected) {
    return (
      <div className="border border-input rounded-md p-3 bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 text-sm min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{selected.name}</span>
              {selected.nameKana && (
                <span className="text-muted-foreground text-xs">({selected.nameKana})</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <span>{selected.employeeId}</span>
              {selected.department && (
                <span className="ml-2">{selected.department}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="社員番号または名前を入力"
          className="pl-8"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>
        )}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((emp) => (
            <button
              key={emp.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => selectEmployee(emp)}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{emp.employeeId}</span>
                <span className="font-medium">{emp.name}</span>
                {emp.nameKana && (
                  <span className="text-xs text-muted-foreground">({emp.nameKana})</span>
                )}
              </div>
              {emp.department && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[emp.department.name, emp.section?.name].filter(Boolean).join(" / ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length > 0 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">該当する社員が見つかりません</p>
        </div>
      )}
    </div>
  );
}
