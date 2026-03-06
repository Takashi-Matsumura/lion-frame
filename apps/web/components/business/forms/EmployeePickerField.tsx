"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  name: string;
  department?: { name: string } | null;
}

export function EmployeePickerField({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  language: "en" | "ja";
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/organization?type=employees");
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue
          placeholder={language === "ja" ? "社員を選択" : "Select employee"}
        />
      </SelectTrigger>
      <SelectContent>
        {employees.map((emp) => (
          <SelectItem key={emp.id} value={emp.id}>
            {emp.name}
            {emp.department && (
              <span className="text-muted-foreground ml-1">
                ({emp.department.name})
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
