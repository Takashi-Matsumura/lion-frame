"use client";

interface CheckInResultData {
  status: "checked_in" | "already_checked_in" | "card_not_found" | "employee_not_found";
  employee?: {
    name: string;
    position: string;
    department: string;
    profileImage: string | null;
  };
  checkedInAt?: string;
}

const statusConfig = {
  checked_in: {
    bg: "bg-green-900/50",
    border: "border-green-500",
    text: "text-green-400",
    label: "チェックイン完了",
    labelEn: "Checked In",
  },
  already_checked_in: {
    bg: "bg-blue-900/50",
    border: "border-blue-500",
    text: "text-blue-400",
    label: "チェックイン済み",
    labelEn: "Already Checked In",
  },
  card_not_found: {
    bg: "bg-red-900/50",
    border: "border-red-500",
    text: "text-red-400",
    label: "カード未登録",
    labelEn: "Card Not Found",
  },
  employee_not_found: {
    bg: "bg-red-900/50",
    border: "border-red-500",
    text: "text-red-400",
    label: "社員が見つかりません",
    labelEn: "Employee Not Found",
  },
};

export function KioskCheckInResult({ result, language = "ja" }: { result: CheckInResultData; language?: "en" | "ja" }) {
  const config = statusConfig[result.status];

  return (
    <div
      className={`${config.bg} ${config.border} border-2 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300`}
    >
      {/* Status Icon */}
      <div className="mb-4">
        {result.status === "checked_in" ? (
          <svg
            className="w-16 h-16 mx-auto text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : result.status === "already_checked_in" ? (
          <svg
            className="w-16 h-16 mx-auto text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-16 h-16 mx-auto text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )}
      </div>

      {/* Status Label */}
      <p className={`text-2xl font-bold ${config.text} mb-4`}>
        {language === "en" ? config.labelEn : config.label}
      </p>

      {/* Employee Info */}
      {result.employee && (
        <div className="space-y-2">
          <p className="text-4xl font-bold text-white">
            {result.employee.name}
          </p>
          <p className="text-xl text-gray-300">
            {result.employee.department} · {result.employee.position}
          </p>
        </div>
      )}
    </div>
  );
}
