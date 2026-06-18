// 11:30AM → 9:30PM, 30-min increments
export const DOOR_TIMES = Array.from({ length: 21 }, (_, i) => {
  const dayMin = 690 + i * 30; // 690 = 11:30AM in minutes
  const h = Math.floor(dayMin / 60);
  const min = dayMin % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")}${ampm}`;
});
