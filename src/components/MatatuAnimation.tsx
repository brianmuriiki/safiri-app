/** Decorative matatu travelling across a softly illustrated Nairobi street. */
export default function MatatuAnimation() {
  return (
    <div className="matatu-track" aria-hidden="true">
      <svg className="matatu-skyline" viewBox="0 0 900 82" preserveAspectRatio="none" fill="none">
        <path d="M0 59h50V36h17V59h25V24h22v35h17V43h29v16h31V31h14v28h23V16h24v43h19V37h36v22h31V28h16v31h23V43h36v16h26V20h18v39h25V35h33v24h30V24h23v35h31V39h28v20h23V17h24v42h22V32h31v27h19V26h22v33h30V43h25v16h34V30h18v29h24V39h27v20h32" fill="#17263b" fillOpacity=".75" />
        <path d="M118 24v-7m3 7v-7m251 14v-8m3 8v-8m196-4v-8m3 8v-8m229 17v-7m3 7v-7" stroke="#fbbf24" strokeOpacity=".28" strokeWidth="1.5" />
        <path d="M0 61h900" stroke="#64748b" strokeOpacity=".18" />
      </svg>
      <div className="matatu-road" />
      <div className="matatu-lane" />
      <svg className="matatu-ride" viewBox="0 0 220 104" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="matatuPaint" x1="24" y1="16" x2="194" y2="84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb923c" />
            <stop offset=".56" stopColor="#ea580c" />
            <stop offset="1" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="matatuGlass" x1="42" y1="25" x2="174" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#172b45" />
            <stop offset=".48" stopColor="#35516d" />
            <stop offset="1" stopColor="#13243a" />
          </linearGradient>
          <linearGradient id="matatuGlassGlint" x1="54" y1="24" x2="87" y2="51" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0f2fe" stopOpacity=".6" />
            <stop offset="1" stopColor="#bae6fd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="matatuMetal" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#475569" />
          </linearGradient>
        </defs>

        <ellipse cx="109" cy="92" rx="91" ry="8" fill="#020617" opacity=".36" />
        {/* Modern high-roof minibus body and front cab */}
        <path d="M14 72V35c0-6 4-11 10-13l11-4V14c0-4 3-7 7-7h91c8 0 15 3 20 9l20 23 18 6c5 2 8 6 8 11v17c0 5-4 9-9 9H23c-5 0-9-4-9-9Z" fill="url(#matatuPaint)" stroke="#fed7aa" strokeWidth="1.5" />
        <path d="M34 18V13c0-2 2-4 4-4h89c8 0 14 3 19 9l7 8H34v-8Z" fill="#fdba74" fillOpacity=".58" />

        {/* Deep tinted passenger windows with individual reflections */}
        <path d="M43 13h24v25H37V20c0-4 2-7 6-7Zm28 0h28v25H71V13Zm32 0h27c5 0 9 2 12 6l12 19h-51V13Z" fill="url(#matatuGlass)" stroke="#fed7aa" strokeOpacity=".85" strokeWidth="1.4" />
        <path d="M44 15h7L41 35h-3V21c0-3 2-6 6-6Zm30 0h4L74 29v-9l2-5Zm34 0h5l-11 22h-5l11-22Z" fill="url(#matatuGlassGlint)" />
        <path d="M69 13v25m33-25v25" stroke="#f1f5f9" strokeOpacity=".62" strokeWidth="1.2" />

        {/* Panoramic front windscreen and side mirror */}
        <path d="m157 28 16 18-24 1V28h8Z" fill="url(#matatuGlass)" stroke="#fed7aa" strokeWidth="1.4" />
        <path d="m160 31 10 12h-17V31h7Z" fill="url(#matatuGlassGlint)" />
        <path d="m174 43 9-2 4 5-12 3" fill="#172033" stroke="#cbd5e1" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M181 49h8" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />

        {/* Clean two-tone beltline and discreet fleet branding */}
        <path d="M29 41h135v3H29z" fill="#fef3c7" />
        <path d="M29 45h133v2H29z" fill="#facc15" />
        <path d="M31 50h78v14H31z" fill="#172033" fillOpacity=".88" />
        <path d="M34 53h4v8h-4zm8 0h4v8h-4zm8 0h4v8h-4zm8 0h4v8h-4zm8 0h4v8h-4zm8 0h4v8h-4zm8 0h4v8h-4z" fill="#e2e8f0" fillOpacity=".84" />
        <path d="M118 51h24v12h-24z" fill="#fff7ed" />
        <text x="120.5" y="59" fill="#c2410c" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="700" letterSpacing=".65">SAFIRI</text>
        <path d="M151 53h13v8h-13z" fill="#fbbf24" fillOpacity=".9" />
        <path d="M157 55h2v4h-2z" fill="#7c2d12" />
        <path d="M23 65h154v9H23z" fill="#172033" />
        <path d="M24 65h150v1.5H24z" fill="#fdba74" fillOpacity=".88" />

        {/* Headlights, grille and bumper */}
        <rect x="16" y="48" width="7" height="10" rx="2" fill="#fef3c7" />
        <path d="M17 49h5v3h-5z" fill="#fff" />
        <rect x="186" y="52" width="8" height="7" rx="2" fill="#fee2e2" />
        <path d="M187 54h6v2h-6z" fill="#fff" />
        <path d="M190 61h9v7h-9z" fill="#0f172a" />
        <path d="M192 63h5v1h-5zm0 2h5v1h-5z" fill="#94a3b8" />
        <path d="M17 76h181" stroke="url(#matatuMetal)" strokeWidth="2" strokeLinecap="round" />

        {/* Roof rack and low-profile destination sign */}
        <path d="M42 5h91" stroke="#cbd5e1" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M48 5l4-4h9l4 4m55 0 4-4h8l4 4" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="77" y="8" width="30" height="4" rx="1.5" fill="#0f172a" />
        <path d="M81 10h22" stroke="#fde68a" strokeWidth="1" strokeLinecap="round" />

        {/* Alloy wheels */}
        <g className="matatu-wheel" transform="translate(54 77)">
          <circle r="14" fill="#0b1220" stroke="#64748b" strokeWidth="2" />
          <circle r="9" fill="url(#matatuMetal)" stroke="#e2e8f0" strokeWidth="1" />
          <circle r="3" fill="#334155" />
          <path className="matatu-wheel-spokes" d="M0-7v4m0 6v4M-7 0h4m6 0h4M-5-5l3 3m4 4 3 3m0-10-3 3m-4 4-3 3" stroke="#f1f5f9" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <g className="matatu-wheel" transform="translate(159 77)">
          <circle r="14" fill="#0b1220" stroke="#64748b" strokeWidth="2" />
          <circle r="9" fill="url(#matatuMetal)" stroke="#e2e8f0" strokeWidth="1" />
          <circle r="3" fill="#334155" />
          <path className="matatu-wheel-spokes" d="M0-7v4m0 6v4M-7 0h4m6 0h4M-5-5l3 3m4 4 3 3m0-10-3 3m-4 4-3 3" stroke="#f1f5f9" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}
