export const scheduleTranslations = {
  en: {
    title: "Calendar",
    today: "Today",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    // Weekday headers
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    // Event detail
    addEvent: "Add Event",
    editEvent: "Edit Event",
    deleteEvent: "Delete Event",
    deleteConfirm: "Are you sure you want to delete this event?",
    noEvents: "No events",
    more: "+{count} more",
    // Event form
    eventTitle: "Title",
    eventTitlePlaceholder: "Enter event title",
    eventDescription: "Description",
    eventDescriptionPlaceholder: "Enter description",
    eventLocation: "Location",
    eventLocationPlaceholder: "Enter location",
    allDay: "All day",
    startDateTime: "Start",
    endDateTime: "End",
    category: "Category",
    categoryPersonal: "Personal",
    categoryWork: "Work",
    categoryMeeting: "Meeting",
    categoryOther: "Other",
    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    // Status
    loading: "Loading...",
    error: "Failed to load data",
    // Holiday
    holiday: "Holiday",
  },
  ja: {
    title: "カレンダー",
    today: "今日",
    prevMonth: "前月",
    nextMonth: "翌月",
    // Weekday headers
    sun: "日",
    mon: "月",
    tue: "火",
    wed: "水",
    thu: "木",
    fri: "金",
    sat: "土",
    // Event detail
    addEvent: "予定を追加",
    editEvent: "予定を編集",
    deleteEvent: "予定を削除",
    deleteConfirm: "この予定を削除してもよろしいですか？",
    noEvents: "予定なし",
    more: "+{count}件",
    // Event form
    eventTitle: "タイトル",
    eventTitlePlaceholder: "タイトルを入力",
    eventDescription: "説明",
    eventDescriptionPlaceholder: "説明を入力",
    eventLocation: "場所",
    eventLocationPlaceholder: "場所を入力",
    allDay: "終日",
    startDateTime: "開始",
    endDateTime: "終了",
    category: "カテゴリ",
    categoryPersonal: "プライベート",
    categoryWork: "仕事",
    categoryMeeting: "会議",
    categoryOther: "その他",
    // Actions
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    // Status
    loading: "読み込み中...",
    error: "データの読み込みに失敗しました",
    // Holiday
    holiday: "祝日",
  },
} as const;

export type Language = keyof typeof scheduleTranslations;
