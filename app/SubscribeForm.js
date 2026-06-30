"use client";

import { useState } from "react";

// Other newsletters people can cross-subscribe to. `id` is the Mailchimp audience id
// (kept in sync with the allowlist in app/api/subscribe/route.js).
const CDN = "https://insightlinks.storage.googleapis.com/digitalhealthwire";
const CROSS_NEWSLETTERS = [
  {
    id: "6f44420470",
    name: "The Imaging Wire",
    desc: "The radiology newsletter that makes it easy to stay informed",
    logo: `${CDN}/2025/09/cropped-favicon.png`,
  },
  {
    id: "9786e7c7fb",
    name: "Digital Health Wire",
    desc: "The best way to stay up-to-date on digital health news",
    logo: `${CDN}/2021/06/digitalhealthwire-plus-sign-300x300.png`,
  },
  {
    id: "fee526ecba",
    name: "Cardiac Wire",
    desc: "The best way to stay up-to-date on cardiology news",
    logo: `${CDN}/2025/09/cropped-Cardiac-Wire-Badge-Transparent.png`,
  },
];

export default function SubscribeForm({ initialStage, initialEmail }) {
  const [stage, setStage] = useState(initialStage);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(payload) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("bad status");
      return true;
    } catch {
      setError("Something went wrong, please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(e) {
    e.preventDefault();
    const value = e.target.email.value.trim();
    if (await send({ step: "email", email: value })) {
      setEmail(value);
      setStage("details");
    }
  }

  async function submitDetails(e) {
    e.preventDefault();
    const form = e.target;
    const newsletters = CROSS_NEWSLETTERS.filter((n) => form[n.id]?.checked).map(
      (n) => n.id
    );
    const ok = await send({
      step: "details",
      email,
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      company: form.company.value.trim(),
      title: form.title.value.trim(),
      newsletters,
    });
    if (ok) setStage("registered");
  }

  if (stage === "registered") {
    return (
      <p className="confirmation">
        You&rsquo;re all set! Check your inbox to confirm your subscription.
      </p>
    );
  }

  if (stage === "details") {
    return (
      <form className="subscribe-form details" onSubmit={submitDetails}>
        <p className="step-note">Complete your profile.</p>
        <input name="firstName" placeholder="First name" autoComplete="given-name" required />
        <input name="lastName" placeholder="Last name" autoComplete="family-name" required />
        <input name="company" placeholder="Company" autoComplete="organization" required />
        <input name="title" placeholder="Job title" autoComplete="organization-title" required />
        {CROSS_NEWSLETTERS.length > 0 && (
          <fieldset className="cross">
            <legend>You might also like&hellip;</legend>
            {CROSS_NEWSLETTERS.map((n) => (
              <div className="cross-card" key={n.id}>
                <input type="checkbox" id={`nl_${n.id}`} name={n.id} />
                <label htmlFor={`nl_${n.id}`}>
                  <span className="cross-logo">
                    <img src={n.logo} alt={n.name} />
                  </span>
                  <span className="cross-info">
                    <span className="cross-name">{n.name}</span>
                    <span className="cross-desc">{n.desc}</span>
                  </span>
                  <span className="cross-check" aria-hidden="true" />
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <button className={busy ? "submit loading" : "submit"} disabled={busy}>
          Finish
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    );
  }

  // stage === "email"
  return (
    <form className="subscribe-form email-step" onSubmit={submitEmail}>
      <input
        name="email"
        type="email"
        placeholder="Your work email"
        autoComplete="email"
        defaultValue={email}
        required
      />
      <button className={busy ? "submit loading" : "submit"} disabled={busy}>
        Subscribe
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
