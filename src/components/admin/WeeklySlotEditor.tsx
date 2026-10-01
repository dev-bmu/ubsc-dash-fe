'use client'

import { useState } from 'react'
import './weekly-slot-editor.css'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export const WEEKDAY_ID: Record<string, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu'
}

export type WeeklySlots = Record<string, string[]>
/** Weekday → "HH:MM" → seats. Only the meetings that differ from the group quota. */
export type SlotQuotas = Record<string, Record<string, number>>

interface Props {
  value: WeeklySlots | null
  onChange: (next: WeeklySlots) => void
  /**
   * "text" is the comma-separated field courts have always used: fast for a
   * venue open 06:00–22:00. "chips" is one control per meeting, which is how
   * a class with three meetings a week is actually edited.
   */
  variant?: 'text' | 'chips'
  /** Class mode knows how long a meeting runs, so a chip can read 09:00 – 10:00. */
  durationMinutes?: number
  /**
   * Per-meeting quota. Passing onQuotasChange turns the seat field on; leave
   * it out and every meeting keeps using the group quota, which is all a
   * court ever needs.
   */
  quotas?: SlotQuotas
  onQuotasChange?: (next: SlotQuotas) => void
  /** Seats a meeting gets when its own field is blank. */
  defaultQuota?: number
}

const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s)

const sortTimes = (times: string[]) => [...new Set(times)].sort((a, b) => a.localeCompare(b))

function endOf(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * The weekly shape of a facility, shared by the facility form and the unit
 * form so the two cannot drift apart.
 */
export function WeeklySlotEditor({ value, onChange, variant = 'text', durationMinutes, quotas, onQuotasChange, defaultQuota }: Props) {
  const slots = value ?? {}

  // The text field keeps its own buffer. Filtering straight into form state
  // deletes "9:0" mid-keystroke and puts it back once the minute lands, which
  // reads as the field eating what you type.
  const [buffer, setBuffer] = useState<Record<string, string>>(() =>
    WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: (slots[day] ?? []).join(', ') }), {} as Record<string, string>)
  )

  // Chips mode types into a visible field and commits with "Tambah". The old
  // field was zero-width and transparent, so clicking the label only focused
  // something nobody could see and a class schedule could never be filled in.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const setDay = (day: string, times: string[]) => onChange({ ...slots, [day]: sortTimes(times) })

  if (variant === 'chips') {
    const total = WEEKDAYS.reduce((n, d) => n + (slots[d] ?? []).length, 0)
    const showQuota = typeof onQuotasChange === 'function'
    const allQuotas = quotas ?? {}

    const addTime = (day: string) => {
      const draft = (drafts[day] ?? '').slice(0, 5)
      if (!isTime(draft)) return

      const times = slots[day] ?? []
      if (!times.includes(draft)) {
        setDay(day, [...times, draft])
      }
      setDrafts((prev) => ({ ...prev, [day]: '' }))
    }

    /** Dropping a meeting drops its quota with it, so a re-added time starts clean. */
    const removeTime = (day: string, time: string) => {
      setDay(
        day,
        (slots[day] ?? []).filter((t) => t !== time)
      )

      if (allQuotas[day]?.[time] !== undefined && onQuotasChange) {
        const perDay = { ...allQuotas[day] }
        delete perDay[time]

        const next = { ...allQuotas }
        if (Object.keys(perDay).length > 0) {
          next[day] = perDay
        } else {
          delete next[day]
        }
        onQuotasChange(next)
      }
    }

    const setQuota = (day: string, time: string, raw: string) => {
      if (!onQuotasChange) return

      const perDay = { ...(allQuotas[day] ?? {}) }
      const parsed = parseInt(raw, 10)

      // Blank means "follow the group quota" — the absence of a number is
      // the setting, so an empty field must delete rather than store 0.
      if (raw.trim() === '' || Number.isNaN(parsed) || parsed < 1) {
        delete perDay[time]
      } else {
        perDay[time] = Math.min(9999, parsed)
      }

      const next = { ...allQuotas }
      if (Object.keys(perDay).length > 0) {
        next[day] = perDay
      } else {
        delete next[day]
      }
      onQuotasChange(next)
    }

    return (
      <div className="flex flex-col gap-2">
        <p className="font-bdo text-[10px] font-medium text-slate-400">
          {total > 0 ? `${total} pertemuan per minggu. Kosongkan hari yang libur.` : 'Belum ada pertemuan. Tambahkan jam pada hari kelas berjalan.'}
          {showQuota && defaultQuota ? ` Kolom kuota kosong = ikut kuota grup (${defaultQuota} orang).` : ''}
        </p>

        {WEEKDAYS.map((day) => {
          const times = slots[day] ?? []
          const draft = drafts[day] ?? ''
          const canAdd = isTime(draft) && !times.includes(draft)

          return (
            <div key={day} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-16 shrink-0 font-bdo text-[11px] font-bold text-slate-500">{WEEKDAY_ID[day]}</span>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                {times.map((time) => {
                  const quota = allQuotas[day]?.[time]

                  return (
                    <span
                      key={time}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7F5] py-1 pr-2 pl-3 font-bdo text-[11px] font-bold text-slate-700 ring-1 ring-[#F8B5A8]/60"
                    >
                      {durationMinutes ? `${time} – ${endOf(time, durationMinutes)}` : time}

                      {showQuota && (
                        <>
                          <span aria-hidden="true" className="h-3 w-px bg-[#F8B5A8]" />
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            inputMode="numeric"
                            aria-label={`Kuota ${WEEKDAY_ID[day]} ${time}`}
                            title={quota === undefined ? `Ikut kuota grup${defaultQuota ? ` (${defaultQuota})` : ''}` : `Kuota khusus pertemuan ini`}
                            value={quota ?? ''}
                            placeholder={defaultQuota ? String(defaultQuota) : '—'}
                            onChange={(e) => setQuota(day, time, e.target.value)}
                            className={`slot-quota-input w-8 font-bdo text-[11px] font-bold ${
                              quota === undefined ? 'text-slate-400' : 'text-[#B93D2A]'
                            }`}
                          />
                          <span className="font-bdo text-[10px] font-medium text-slate-400">org</span>
                        </>
                      )}

                      <button
                        type="button"
                        aria-label={`Hapus ${WEEKDAY_ID[day]} ${time}`}
                        onClick={() => removeTime(day, time)}
                        className="ml-0.5 text-slate-400 transition hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </span>
                  )
                })}

                <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white py-[3px] pr-[3px] pl-3 transition focus-within:border-[#F8B5A8] focus-within:ring-2 hover:border-slate-400">
                  <input
                    type="time"
                    aria-label={`Jam baru ${WEEKDAY_ID[day]}`}
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [day]: e.target.value.slice(0, 5)
                      }))
                    }
                    onKeyDown={(e) => {
                      // Inside a <form>, Enter on a lone input submits
                      // the whole facility. Commit the chip instead.
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTime(day)
                      }
                    }}
                    className="slot-time-input w-[66px] font-bdo text-[11px] font-bold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => addTime(day)}
                    disabled={!canAdd}
                    aria-label={`Tambah jam ${WEEKDAY_ID[day]}`}
                    className={`rounded-full px-2.5 py-[3px] font-bdo text-[11px] font-bold transition ${
                      canAdd
                        ? 'bg-[linear-gradient(135deg,#F08C78_0%,#E35336_52%,#B93D2A_100%)] text-white shadow-[0_8px_16px_-12px_rgba(227,83,54,.9)] hover:-translate-y-px'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    ＋ Tambah
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="facility-scrollbar flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
      {WEEKDAYS.map((day) => (
        <div key={day} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-16 shrink-0 font-bdo text-[11px] font-bold text-slate-500">{WEEKDAY_ID[day]}</span>
          <input
            type="text"
            aria-label={`Slot jadwal ${WEEKDAY_ID[day]}`}
            value={buffer[day] ?? ''}
            onChange={(e) => {
              const txt = e.target.value
              setBuffer((p) => ({ ...p, [day]: txt }))
              setDay(
                day,
                txt
                  .split(',')
                  .map((s) => s.trim())
                  .filter(isTime)
              )
            }}
            placeholder="misal: 16:00, 19:00"
            className="input-field mono flex-1"
          />
        </div>
      ))}
      <p className="mt-1 font-bdo text-[10px] text-slate-400">Kosongkan hari yang libur. Format: HH:MM dipisah koma.</p>
    </div>
  )
}
