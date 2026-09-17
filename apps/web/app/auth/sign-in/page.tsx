import WebThreads from '@/components/WebThreads';
import { SignInForm } from '@/features/auth/SignInForm';

export default function SignIn() {
  return (
    <main className="bg-background min-h-screen w-full p-4 sm:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 gap-4 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.15fr_0.85fr]">
        {/* LEFT PANEL */}
        <section className="border-border relative hidden overflow-hidden rounded-3xl border bg-black lg:block">
          {/* ReactBits animation */}
          <div className="absolute inset-0">
            <WebThreads
              color1="#A78BFA"
              color2="#38BDF8"
              color3="#E0E7FF"
              speed={0.035}
              threadCount={5}
              frequency={5}
              spread={0.22}
              taper={0.4}
              position={0.5}
              fanMode="right"
              glow={0.018}
              falloff={0.6}
              thickness={1}
              brightness={0.38}
              opacity={0.72}
              mirror={false}
              shimmer={false}
              grain={false}
              grainIntensity={0}
              mouseInteraction={false}
              mouseStrength={0.2}
            />
          </div>
          <div className="from-background via-background/40 pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t to-transparent" />
          {/* Branding */}
          <div className="absolute inset-0 z-10 flex items-end p-8 sm:p-10 lg:p-12 xl:p-16">
            <div className="max-w-lg">
              <h1 className="text-primary-foreground text-4xl font-semibold tracking-tight xl:text-5xl">
                Welcome back to Cadence.
              </h1>

              <p className="text-primary-foreground/70 mt-4 max-w-md text-base leading-relaxed xl:text-lg">
                Everything you need to orchestrate your workflow seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="border-border bg-background flex items-center justify-center rounded-3xl border px-6 py-10 sm:px-10 lg:px-12 xl:px-20">
          <div className="w-full max-w-md">
            <div className="mb-8 space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                Login to your account
              </p>

              <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome Back!
              </h2>

              <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                Enter your email and password to continue.
              </p>
            </div>

            <SignInForm />
          </div>
        </section>
      </div>
    </main>
  );
}
