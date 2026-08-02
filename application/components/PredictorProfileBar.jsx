"use client";

import { BookmarkPlus, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function PredictorProfileBar({ admissionRoute, formData, onLoad }) {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [name, setName] = useState("");
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadProfiles() {
    const response = await fetch(`/api/student-profiles?route=${admissionRoute}`);
    if (response.status === 401) {
      setAvailable(false);
      return;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load profiles.");
    setAvailable(true);
    setProfiles(payload.data || []);
  }

  useEffect(() => {
    loadProfiles().catch(() => setAvailable(false));
  }, [admissionRoute]);

  async function saveProfile() {
    if (!name.trim()) {
      setNotice("Enter a short profile name first.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/student-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), admissionRoute, formData })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save profile.");
      await loadProfiles();
      setProfileId(String(payload.data.id));
      setNotice("Profile saved to your account.");
    } catch (error) {
      setNotice(error.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function loadSelectedProfile() {
    const profile = profiles.find((item) => String(item.id) === profileId);
    if (!profile) {
      setNotice("Choose a saved profile first.");
      return;
    }
    onLoad(profile.formData);
    setName(profile.name);
    setNotice(`${profile.name} loaded. Press Predict Colleges to run it.`);
  }

  if (!available) return null;

  return (
    <section className="grid gap-3 border-y border-line bg-panel px-3 py-3" aria-label={`${admissionRoute} saved profiles`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-action">Saved profile</p>
        <span className="text-xs text-slate-500">{profiles.length}/25</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]">
        <select className="focus-ring min-h-11 min-w-0 rounded border border-line bg-white px-3 text-sm" value={profileId} onChange={(event) => setProfileId(event.target.value)}>
          <option value="">{profiles.length ? "Choose saved profile" : "No saved profiles yet"}</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold disabled:opacity-50" type="button" disabled={!profileId} onClick={loadSelectedProfile}>
          <RotateCcw aria-hidden="true" size={16} /> Load
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]">
        <input className="focus-ring min-h-11 min-w-0 rounded border border-line bg-white px-3 text-sm" maxLength={60} placeholder="Profile name, e.g. Computer in Pune" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded bg-action px-3 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={saving} onClick={saveProfile}>
          {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <BookmarkPlus aria-hidden="true" size={16} />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {notice ? <p className="text-xs leading-5 text-slate-600" role="status">{notice}</p> : null}
    </section>
  );
}
