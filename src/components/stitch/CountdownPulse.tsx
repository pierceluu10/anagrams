"use client";

/** Swagrams — pre-round countdown digit (shrinking “Mario Kart” style). */

type Props = {
  value: number;
  className?: string;
};

/** Large digit that shrinks in — Mario Kart–style pre-round tick (3, 2, 1). */
export function CountdownPulse({ value, className = "" }: Props) {
  if (value <= 0) return null;
  return (
    <div
      className={`flex min-h-[20rem] items-center justify-center ${className}`}
      aria-live="polite"
      aria-label={`Countdown ${value}`}
    >
      <span key={value} className="countdown-pulse-digit text-[10rem] leading-none font-headline font-extrabold text-primary drop-shadow-[0_0_60px_rgba(206,193,225,0.4)]">
        {value}
      </span>
    </div>
  );
}
