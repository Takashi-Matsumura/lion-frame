export const reservationTranslations = {
  en: {
    pageTitle: "Reservations",
    pageDescription: "Browse resources and make reservations",
    // Tabs
    browse: "Browse",
    myReservations: "My Reservations",
    // Types
    all: "All",
    typeRoom: "Rooms",
    typeVehicle: "Vehicles",
    typeEquipment: "Equipment",
    // Resource cards
    location: "Location",
    capacity: "Capacity",
    persons: "persons",
    requiresApproval: "Requires approval",
    instantConfirm: "Instant confirm",
    viewSchedule: "View Schedule",
    notes: "Notes",
    // Calendar / timeline
    schedule: "Schedule",
    today: "Today",
    prev: "Previous",
    next: "Next",
    available: "Available",
    reserved: "Reserved",
    noResources: "No resources available",
    // Reservation form
    makeReservation: "Make Reservation",
    editReservation: "Edit Reservation",
    title: "Title / Purpose",
    startTime: "Start Time",
    endTime: "End Time",
    date: "Date",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    reservationCreated: "Reservation created",
    reservationUpdated: "Reservation updated",
    // My reservations
    noReservations: "No reservations yet",
    cancelReservation: "Cancel Reservation",
    cancelConfirm: "Are you sure you want to cancel this reservation?",
    cancelled: "Cancelled",
    // Status
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusCancelled: "Cancelled",
    statusReturned: "Returned",
    // Errors
    conflict: "This time slot is already taken",
    pastDate: "Cannot reserve in the past",
    invalidTimeRange: "End time must be after start time",
    fetchError: "Failed to load data",
    saveError: "Failed to save reservation",
  },
  ja: {
    pageTitle: "予約",
    pageDescription: "リソースの閲覧と予約",
    // Tabs
    browse: "リソース一覧",
    myReservations: "マイ予約",
    // Types
    all: "すべて",
    typeRoom: "会議室",
    typeVehicle: "社用車",
    typeEquipment: "備品",
    // Resource cards
    location: "場所",
    capacity: "定員",
    persons: "名",
    requiresApproval: "承認が必要",
    instantConfirm: "即時確定",
    viewSchedule: "スケジュール",
    notes: "備考",
    // Calendar / timeline
    schedule: "スケジュール",
    today: "今日",
    prev: "前",
    next: "次",
    available: "空き",
    reserved: "予約済み",
    noResources: "利用可能なリソースはありません",
    // Reservation form
    makeReservation: "予約する",
    editReservation: "予約を編集",
    title: "件名・用途",
    startTime: "開始時間",
    endTime: "終了時間",
    date: "日付",
    save: "保存",
    cancel: "キャンセル",
    close: "閉じる",
    reservationCreated: "予約を作成しました",
    reservationUpdated: "予約を更新しました",
    // My reservations
    noReservations: "予約はまだありません",
    cancelReservation: "予約をキャンセル",
    cancelConfirm: "この予約をキャンセルしますか？",
    cancelled: "キャンセル済み",
    // Status
    statusPending: "承認待ち",
    statusConfirmed: "確定",
    statusCancelled: "キャンセル",
    statusReturned: "返却済み",
    // Errors
    conflict: "この時間帯はすでに予約されています",
    pastDate: "過去の日時には予約できません",
    invalidTimeRange: "終了時間は開始時間より後にしてください",
    fetchError: "データの読み込みに失敗しました",
    saveError: "予約の保存に失敗しました",
  },
} as const;

export type ReservationTranslations =
  (typeof reservationTranslations)[keyof typeof reservationTranslations];
