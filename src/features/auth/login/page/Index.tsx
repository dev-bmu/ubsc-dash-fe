'use client'

import '../login.css'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'

import { routes } from '@/config/routes'
import { setAccessToken } from '@/lib/axios'
import { useLogin } from '@/hooks/api/useAuth'
import { LoginValidation } from '../components/validation/LoginValidation'

// ── Schema ─────────────────────────────────────────────────────────────────────
// Skema email/password dipakai ulang APA ADANYA dari LoginValidation.ts (kontrak yang sama
// dengan LoginForm lama). `remember` hanya untuk mengikat checkbox "Keep me signed in" —
// tidak dikirim ke API (login ubsc-api hanya menerima { email, password }).
const loginSchema = LoginValidation.extend({ remember: z.boolean() })
type LoginFormValues = z.infer<typeof loginSchema>

// ── Live Clock ────────────────────────────────────────────────────────────────

function LiveClock() {
  // Jam diisi SETELAH mount (bukan new Date() saat init): render server & render awal klien sama-sama
  // kosong sehingga tidak ada mismatch hydration; waktu muncul begitu efek jalan lalu berdetak.
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const h12 = time ? time.getHours() % 12 || 12 : 0
  const ampm = time && time.getHours() >= 12 ? 'PM' : 'AM'
  return (
    <div className="u-clock">
      <div className="u-clock-time">{time ? `${pad(h12)}:${pad(time.getMinutes())}:${pad(time.getSeconds())} ${ampm}` : ''}</div>
      <div className="u-clock-date">{time ? `${MONTHS[time.getMonth()]} ${pad(time.getDate())}, ${time.getFullYear()}` : ''}</div>
    </div>
  )
}

// ── Eye Icon ──────────────────────────────────────────────────────────────────

function EyeOpen() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Login Content ─────────────────────────────────────────────────────────────
// Logika form MEMAKAI ULANG LoginForm.tsx yang sudah jalan: react-hook-form + zodResolver,
// useLogin() (mutasi), setAccessToken, sanitasi returnUrl, dan penanganan error/toast.
// Hanya markup-nya yang diganti dengan kartu portal pegawai dari Laravel (visual 1:1).

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false }
  })

  const { mutateAsync: loginUser, isPending, error } = useLogin()

  const onSubmit = async (values: LoginFormValues) => {
    try {
      // Payload identik dengan LoginForm lama: { email, password } saja (kontrak ubsc-api).
      const data = await loginUser({ email: values.email, password: values.password })
      setAccessToken(data.accessToken)
      toast.success('Login berhasil!')

      // returnUrl hanya diterima jika path internal — cegah open redirect.
      const target = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : routes.dashboard()
      // returnUrl baru diketahui saat runtime, jadi mustahil dipersempit ke union typedRoutes.
      // Tipe tujuan diambil dari parameter router.replace itu sendiri — bukan `Route` dari 'next',
      // yang baru ada setelah .next/types ditulis dan akan menggagalkan tsc di clone yang bersih.
      router.replace(target as Parameters<typeof router.replace>[0])
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal, silakan coba lagi.')
    }
  }

  return (
    <div className="u-page ubsc-page-login">
      <div className="u-grain" aria-hidden="true" />
      <div className="u-grid" aria-hidden="true" />
      <div className="u-glow-a" aria-hidden="true" />
      <div className="u-glow-b" aria-hidden="true" />

      {/* Top Bar */}
      <header className="u-topbar">
        <div className="u-brand">
          <div className="u-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo dari public/, butuh filter brightness(0) invert(1) via .u-logo-wrap */}
            <img src="/UBSC PRO.png" alt="UBSC PRO" className="u-logo-img" />
          </div>
          <div className="u-brand-sep" aria-hidden="true" />
          <span className="u-brand-name">UB Sport System</span>
        </div>
        <LiveClock />
      </header>

      {/* Left sidebar — desktop decorative */}
      <nav className="u-sidebar" aria-hidden="true">
        <div className="u-sidebar-tick" />
        {['Staff Portal', 'Secure Access', 'Admin Area', 'UBSC PRO', 'Private'].map((l) => (
          <span key={l} className="u-sidebar-item">
            {l}
          </span>
        ))}
      </nav>

      {/* Main */}
      <main className="u-main">
        <div className="u-wrap">
          <div className="u-card">
            {/* Header */}
            <div className="u-card-hd">
              {/* Asterisk mark */}
              <div className="u-mark" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Ball body */}
                  <circle cx="17" cy="17" r="15" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                  {/* Felt seam curves — left arc */}
                  <path d="M 7 7 C 10 14, 10 20, 7 27" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  {/* Felt seam curves — right arc */}
                  <path d="M 27 7 C 24 14, 24 20, 27 27" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  {/* Inner glow highlight */}
                  <ellipse cx="13" cy="12" rx="4" ry="2.5" fill="rgba(255,255,255,0.1)" transform="rotate(-20 13 12)" />
                </svg>
              </div>

              <h1 className="u-heading">
                {/* Shiny shimmer on "Sign in to your" */}
                <span className="u-heading-shiny text-3xl">Selamat Datang di</span>
                <em className="u-heading-dim text-2xl">Portal Pegawai UB Sport Center</em>
              </h1>

              <p className="u-subtext">UBSC PRO — Admin Dashboard &amp; Management System</p>
            </div>

            {/* Body */}
            <div className="u-card-bd">
              {/* Slot sukses (u-alert-ok): Laravel memakai flash `status` server-side; belum ada sumbernya di
                  Next (feedback sukses kini lewat toast sonner). Tidak ada padanan status/flash server-side di arsitektur ini (JWT tanpa session). */}
              {errors.email && <div className="u-alert u-alert-err">{errors.email.message}</div>}
              {errors.password && <div className="u-alert u-alert-err">{errors.password.message}</div>}
              {error && <div className="u-alert u-alert-err">{error.message}</div>}

              <form onSubmit={handleSubmit(onSubmit)} className="u-form">
                {/* Email */}
                <div className="u-field">
                  <label htmlFor="email" className="u-label">
                    Email Address
                  </label>
                  <div className="u-input-wrap">
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      autoFocus
                      required
                      className="u-input"
                      placeholder="your@email.com"
                      {...register('email')}
                    />
                  </div>
                </div>

                {/* Password + eye toggle */}
                <div className="u-field">
                  <label htmlFor="password" className="u-label">
                    Password
                  </label>
                  <div className="u-input-wrap">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="u-input has-eye"
                      placeholder="••••••••••••"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="u-eye-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="u-field">
                  <div className="u-check-row">
                    <input id="remember" type="checkbox" className="u-checkbox" {...register('remember')} />
                    <label htmlFor="remember" className="u-check-label">
                      Keep me signed in
                    </label>
                  </div>
                </div>

                <div className="u-divider" aria-hidden="true" />

                {/* Submit */}
                <div className="u-field">
                  <button type="submit" disabled={isPending} className="u-btn">
                    {isPending ? (
                      <>
                        <svg className="u-spinner" width="16" height="16" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                          <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in…
                      </>
                    ) : (
                      'Masuk →'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Kembali ke situs publik landing (origin berbeda dari admin). URL eksternal https, tidak kena no-restricted-syntax. */}
          <a href="https://ubsportcenter.co.id" className="u-back">
            ← Kembali ke website
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="u-footer">
        <p className="u-footer-txt">
          UB Sport Center
          <br />
          Staff Access System
          <br />
          Secure — Private
        </p>
        <p className="u-footer-txt" style={{ textAlign: 'right' }}>
          © {new Date().getFullYear()} UBSC PRO
          <br />
          Admin System
        </p>
      </footer>
    </div>
  )
}

// ── Main Login Component ──────────────────────────────────────────────────────
// useSearchParams() wajib dibungkus Suspense di App Router (bailout CSR saat next build) —
// pola yang sama dipakai Index.tsx sebelumnya untuk membungkus LoginForm.

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
