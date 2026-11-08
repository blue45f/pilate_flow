# Saved sequence card QA
Source: schedule-saved-history-concept(1).png, saved mobile panel, viewed directly.
Claims: compact title/description + open/more card; every prior function remains behind inline disclosure; sample/recovery indicators stay visible; no persistence/model change.
Controls: open, more/collapse, Escape, stage entry, copy, print/modal close, text export, log form, delete/cancel/confirm, search, sort after copy.
State checks: UI-only toggles do not mutate schedules/draft/history/saved data. Correct card stays expanded after sort. Closing details clears delete confirmation. Printing leaves details open and returns focus. Deletion preserves history, confirms explicitly, returns focus to next card/search. Reload returns disclosure to closed and preserves saved data.
Visual checks: 320/390/768/1024/1440, short height, root text200%, long title; closed/open cards; source compact 2-button row; no horizontal overflow/clipped controls; neighbour card does not stretch.
Exploratory checks: filter expanded card away and back; expand another while deletion pending; print Escape/backdrop/close; duplicate then delete copy; empty search recovery; keyboard Tab skips hidden tools.
