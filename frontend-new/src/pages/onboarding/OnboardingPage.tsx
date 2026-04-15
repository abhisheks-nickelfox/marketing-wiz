import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from '@untitled-ui/icons-react';
import Logo from '../../components/Logo';
import OnboardingStepper from '../../components/onboarding/OnboardingStepper';
import Avatar from '../../components/ui/Avatar';
import { onboardingApi } from '../../lib/api';

// ── Steps config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Set your password' },
  { label: 'Enter your Personal details' },
  { label: 'Choose your avatar' },
];

// ── Avatar colour palette (8 options matching Avatar.tsx) ─────────────────────

const AVATAR_PALETTE = [
  { key: 'purple',  bg: '#C9B8F0', label: 'Purple'  },
  { key: 'blue',    bg: '#B8D4F0', label: 'Blue'    },
  { key: 'green',   bg: '#B8F0C9', label: 'Green'   },
  { key: 'orange',  bg: '#F0D8B8', label: 'Orange'  },
  { key: 'pink',    bg: '#F0B8D4', label: 'Pink'    },
  { key: 'indigo',  bg: '#B8C4F0', label: 'Indigo'  },
  { key: 'teal',    bg: '#B8F0EC', label: 'Teal'    },
  { key: 'yellow',  bg: '#F0EAB8', label: 'Yellow'  },
];

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputBase =
  'w-full bg-white border rounded-lg px-3.5 py-2.5 text-base text-[#181D27] placeholder-[#717680] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9E77ED] focus:border-transparent';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';

  // Token validation state
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError,   setTokenError]   = useState('');
  const [userEmail,    setUserEmail]    = useState('');
  const [initialName,  setInitialName]  = useState('');

  // Wizard state
  const [step,     setStep]     = useState(0); // 0-based
  const [submitting, setSubmitting] = useState(false);
  const [done,     setDone]     = useState(false);

  // Step 1 — password
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwError,   setPwError]   = useState('');

  // Step 2 — personal details
  const [name,  setName]  = useState('');
  const [nameError, setNameError] = useState('');

  // Step 3 — avatar
  const [avatarKey, setAvatarKey] = useState(AVATAR_PALETTE[0].key);

  // ── Validate token on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError('No invite token found. Please check your email link.');
      setTokenLoading(false);
      return;
    }

    onboardingApi
      .validate(token)
      .then(({ email, name: n }) => {
        setUserEmail(email);
        setInitialName(n);
        setName(n);
      })
      .catch((err: Error) => setTokenError(err.message))
      .finally(() => setTokenLoading(false));
  }, [token]);

  // ── Step handlers ───────────────────────────────────────────────────────────

  function handlePasswordNext() {
    setPwError('');
    if (password.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setPwError('Passwords do not match');
      return;
    }
    setStep(1);
  }

  function handleDetailsNext() {
    setNameError('');
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setStep(2);
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      const result = await onboardingApi.complete({
        token,
        name: name.trim(),
        password,
      });

      if (result.token) {
        localStorage.setItem('mw_token', result.token);
      }

      setDone(true);

      // Redirect to dashboard after a short celebration delay
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    } catch (err) {
      // Show error on avatar step
      setPwError((err as Error).message);
      setStep(0); // bounce back to step 1 on auth error
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-[#717680]">Verifying your invite link…</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
            <AlertCircle width={28} height={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-[#181D27] mb-2">Invite link invalid</h2>
          <p className="text-sm text-[#717680] mb-6">{tokenError}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm font-semibold text-[#7F56D9] hover:text-[#6941C6]"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F4EBFF] mb-4">
            <CheckCircle width={32} height={32} className="text-[#7F56D9]" />
          </div>
          <h2 className="text-2xl font-semibold text-[#181D27] mb-1">
            Welcome aboard!
          </h2>
          <p className="text-sm text-[#717680]">Redirecting you to the dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  const selectedBg =
    AVATAR_PALETTE.find((p) => p.key === avatarKey)?.bg ?? AVATAR_PALETTE[0].bg;

  return (
    <div className="min-h-screen flex bg-white font-sans">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col bg-[#FAFAFA] border-r border-[#E9EAEB] px-8 py-10">
        {/* Logo */}
        <div className="mb-10">
          <Logo size="sm" />
        </div>

        {/* Welcome copy */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#181D27] leading-snug">
            Welcome to AI Wealth Connections
          </h2>
          <p className="text-sm text-[#717680] mt-1">
            Let's get your account set up in just a few steps.
          </p>
        </div>

        {/* Stepper */}
        <OnboardingStepper steps={STEPS} currentStep={step} />
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo + step indicator */}
        <div className="lg:hidden mb-8 text-center">
          <Logo size="sm" stacked />
          <p className="mt-3 text-xs text-[#717680] font-medium uppercase tracking-wider">
            Step {step + 1} of {STEPS.length} — {STEPS[step].label}
          </p>
        </div>

        <div className="w-full max-w-md">

          {/* ── STEP 1: Set Password ── */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#181D27]">Set your password</h1>
                <p className="text-sm text-[#717680] mt-1">
                  Setting up account for <span className="font-medium text-[#414651]">{userEmail}</span>
                </p>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#414651]">
                  Enter Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwError(''); }}
                    placeholder="Min. 8 characters"
                    className={`${inputBase} pr-10 ${pwError ? 'border-[#FDA29B] focus:ring-[#FDA29B]' : 'border-[#D5D7DA]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717680] hover:text-[#414651]"
                    tabIndex={-1}
                  >
                    {showPw
                      ? <EyeOff width={18} height={18} />
                      : <Eye width={18} height={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#414651]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setPwError(''); }}
                    placeholder="Re-enter your password"
                    className={`${inputBase} pr-10 ${pwError ? 'border-[#FDA29B] focus:ring-[#FDA29B]' : 'border-[#D5D7DA]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717680] hover:text-[#414651]"
                    tabIndex={-1}
                  >
                    {showConf
                      ? <EyeOff width={18} height={18} />
                      : <Eye width={18} height={18} />}
                  </button>
                </div>
                {pwError && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle width={14} height={14} className="text-[#D92D20] shrink-0" />
                    <p className="text-sm text-[#D92D20]">{pwError}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handlePasswordNext}
                className="w-full bg-[#7F56D9] hover:bg-[#6941C6] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Continue
              </button>
            </div>
          )}

          {/* ── STEP 2: Personal Details ── */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#181D27]">Personal details</h1>
                <p className="text-sm text-[#717680] mt-1">
                  Tell us a bit about yourself.
                </p>
              </div>

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#414651]">Email address</label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly
                  className={`${inputBase} border-[#D5D7DA] bg-[#FAFAFA] text-[#717680] cursor-not-allowed`}
                />
                <p className="text-xs text-[#A4A7AE]">
                  Your email address is set by your admin and cannot be changed here.
                </p>
              </div>

              {/* Full name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#414651]">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  placeholder="Your full name"
                  className={`${inputBase} ${nameError ? 'border-[#FDA29B] focus:ring-[#FDA29B]' : 'border-[#D5D7DA]'}`}
                />
                {nameError && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle width={14} height={14} className="text-[#D92D20] shrink-0" />
                    <p className="text-sm text-[#D92D20]">{nameError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-[#D5D7DA] text-[#414651] text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleDetailsNext}
                  className="flex-1 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Choose Avatar ── */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#181D27]">Choose your avatar</h1>
                <p className="text-sm text-[#717680] mt-1">
                  Pick a colour for your profile avatar.
                </p>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center gap-3 py-4">
                <Avatar
                  name={name || initialName}
                  size="xl"
                  style={{ backgroundColor: selectedBg, width: 80, height: 80, fontSize: 28 }}
                />
                <p className="text-sm font-medium text-[#414651]">{name || initialName}</p>
                <p className="text-xs text-[#717680]">{userEmail}</p>
              </div>

              {/* Colour grid */}
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_PALETTE.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setAvatarKey(p.key)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      avatarKey === p.key
                        ? 'border-[#7F56D9] bg-[#F9F5FF]'
                        : 'border-[#E9EAEB] hover:border-[#C4B5FD]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: p.bg }}
                    />
                    <span className="text-[10px] font-medium text-[#717680]">
                      {p.label}
                    </span>
                    {avatarKey === p.key && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#7F56D9] flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 4l2 2 3-3"
                            stroke="#fff"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="flex-1 bg-white hover:bg-gray-50 border border-[#D5D7DA] text-[#414651] text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="flex-1 bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? 'Setting up…' : 'Get started'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
