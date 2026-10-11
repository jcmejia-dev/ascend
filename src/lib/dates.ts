/**
 * Calendar date in the selected IANA time zone.
 * Shared by the learning engine and the app's state model.
 */
export const dateKey = (date = new Date(), timezone = "Asia/Manila") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
