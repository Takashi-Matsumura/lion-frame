"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Department {
  id: string;
  name: string;
}

export function DepartmentPickerField({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  language: "en" | "ja";
}) {
  const [departments, setDepartments] = useState<Department[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/organization?type=departments");
      if (!res.ok) return;
      const data = await res.json();
      setDepartments(data.departments ?? []);
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
          placeholder={language === "ja" ? "部署を選択" : "Select department"}
        />
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
