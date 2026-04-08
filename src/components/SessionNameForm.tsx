"use client";

// Swagrams — temporary display name form

import { useState } from "react";

type Props = {
  onSubmit: (name: string) => void;
  buttonLabel: string;
};

export function SessionNameForm({ onSubmit, buttonLabel }: Props) {
  const [name, setName] = useState("");

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        const clean = name.trim();
        if (clean.length < 2) return;
        onSubmit(clean);
      }}
    >
      <label className="subtle" htmlFor="name">Display name</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your name" maxLength={18} required />
      <button className="stitch-btn stitch-btn--tan" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
