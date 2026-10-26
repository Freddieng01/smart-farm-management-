// Dashboard hero scene. The sky follows the clock: the sun travels across the
// sky during the day (and rises/sets behind the ridge), the moon and stars
// come out at night. The land is drawn as layered ridgelines above a field
// of crop rows. Everything is SVG, so it stays crisp on any screen.

const palettes = {
    day: { far: '#4fb582', mid: '#2a8a5a', near: '#14532d', rows: '#86d9a3' },
    dawn: { far: '#7fae85', mid: '#2f7a55', near: '#14532d', rows: '#e8b987' },
    dusk: { far: '#93927f', mid: '#3d6e55', near: '#14472b', rows: '#e6a76f' },
    night: { far: '#12382a', mid: '#0e3022', near: '#0a2418', rows: '#2a6a4a' },
};

const stars = [[8, 14], [16, 38], [24, 10], [33, 26], [44, 12], [55, 34], [63, 9], [71, 24], [82, 13], [91, 33], [96, 18], [38, 42]];

// x positions where the crop rows meet the bottom edge of the picture
const rowEnds = Array.from({ length: 33 }, (_, i) => -1200 + i * 120);

function celestial(sky) {
    if (sky.night) {
        return { left: '80%', top: '24%', kind: 'moon' };
    }

    // Sun travels from about 05:30 to 19:30 along a gentle arc, on the right
    // half of the sky so it never sits behind the greeting text.
    const t = Math.min(Math.max((sky.hour - 5.5) / 14, 0), 1);
    const left = 52 + t * 38;
    const top = 72 - Math.sin(Math.PI * t) * 34;

    return { left: `${left}%`, top: `${top}%`, kind: 'sun' };
}

const bodyStyle = {
    sun: {
        dawn: 'bg-orange-200 shadow-[0_0_70px_24px_rgba(253,186,116,0.55)]',
        day: 'bg-amber-100 shadow-[0_0_80px_28px_rgba(254,243,199,0.55)]',
        dusk: 'bg-orange-200 shadow-[0_0_70px_24px_rgba(253,164,175,0.5)]',
    },
    moon: 'bg-slate-100 shadow-[0_0_40px_10px_rgba(226,232,240,0.22),inset_-9px_-3px_0_0_rgba(15,23,42,0.28)]',
};

export default function FarmScene({ sky }) {
    const c = palettes[sky.phase] || palettes.day;
    const body = celestial(sky);
    const bodyClass = body.kind === 'moon' ? bodyStyle.moon : bodyStyle.sun[sky.phase] || bodyStyle.sun.day;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {sky.night && (
                <svg className="absolute inset-0 h-full w-full">
                    {stars.map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r="1.3" fill="#ffffff" opacity="0.7" />
                    ))}
                </svg>
            )}

            <div
                className={`absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 sm:opacity-100 ${bodyClass}`}
                style={{ left: body.left, top: body.top }}
            />

            {!sky.night && (
                <>
                    <div
                        className="absolute left-0 top-[22%] h-8 w-72 animate-drift rounded-full bg-white/15 blur-xl motion-reduce:animate-none"
                        style={{ animationDuration: '140s', animationDelay: '-30s' }}
                    />
                    <div
                        className="absolute left-0 top-[40%] h-6 w-52 animate-drift rounded-full bg-white/10 blur-xl motion-reduce:animate-none"
                        style={{ animationDuration: '190s', animationDelay: '-110s' }}
                    />
                </>
            )}

            <svg
                viewBox="0 0 1440 240"
                preserveAspectRatio="xMidYMax slice"
                className="absolute inset-x-0 bottom-0 h-32 w-full sm:h-44"
            >
                <defs>
                    <linearGradient id="ffms-far" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={c.far} />
                        <stop offset="1" stopColor={c.mid} />
                    </linearGradient>
                    <linearGradient id="ffms-mid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={c.mid} />
                        <stop offset="1" stopColor={c.near} />
                    </linearGradient>
                    <clipPath id="ffms-field">
                        <path d="M0,204 C220,184 480,196 720,186 C980,176 1220,196 1440,184 L1440,240 L0,240 Z" />
                    </clipPath>
                </defs>

                {/* distant ridge */}
                <path
                    d="M0,150 C120,128 240,122 380,138 C520,154 600,120 760,112 C920,104 1040,134 1200,126 C1300,121 1380,128 1440,136 L1440,240 L0,240 Z"
                    fill="url(#ffms-far)"
                />

                {/* middle ridge */}
                <path
                    d="M0,176 C160,150 300,150 460,166 C620,182 760,146 940,142 C1100,138 1250,164 1440,152 L1440,240 L0,240 Z"
                    fill="url(#ffms-mid)"
                />

                {/* field with crop rows running to the horizon */}
                <path
                    d="M0,204 C220,184 480,196 720,186 C980,176 1220,196 1440,184 L1440,240 L0,240 Z"
                    fill={c.near}
                />
                <g clipPath="url(#ffms-field)" stroke={c.rows} strokeWidth="1.4" opacity="0.4">
                    {rowEnds.map((x) => (
                        <line key={x} x1="720" y1="176" x2={x} y2="240" />
                    ))}
                </g>
                <path
                    d="M0,204 C220,184 480,196 720,186 C980,176 1220,196 1440,184"
                    fill="none"
                    stroke={c.rows}
                    strokeWidth="1.5"
                    opacity="0.35"
                />

                {/* soft edge into the page background */}
                <path
                    d="M0,222 C300,210 620,230 900,220 C1140,211 1300,228 1440,218 L1440,240 L0,240 Z"
                    fill="#f1f8f1"
                />
            </svg>
        </div>
    );
}
