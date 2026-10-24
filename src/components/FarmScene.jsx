// Dashboard hero scene: sky objects (sun/moon, stars, clouds) plus a flat
// farm landscape (hills, barn, silos, cows). Drawn as SVG so it stays crisp
// at any screen size. Colours switch to a night palette after dark.

const bodyStyles = {
    sun: 'bg-harvest-400 shadow-[0_0_60px_20px_rgba(245,185,50,0.5)]',
    moon: 'bg-slate-100 shadow-[0_0_50px_12px_rgba(226,232,240,0.35)]',
};

const stars = [[8, 18], [18, 42], [27, 12], [36, 30], [48, 15], [58, 38], [67, 10], [76, 28], [86, 16], [93, 40]];

const clouds = [
    { top: '18%', width: 'w-28', duration: '70s', delay: '-10s' },
    { top: '38%', width: 'w-20', duration: '95s', delay: '-45s' },
    { top: '10%', width: 'w-24', duration: '120s', delay: '-80s' },
];

const day = {
    farHill: '#8cc287',
    hillA: '#4f9a4f',
    crest: '#c9e8a6',
    hillB: '#6aae66',
    hillC: '#5aa257',
    meadow: '#78bf6d',
    patch: '#b4de8e',
    wall: '#f3efe4',
    roofBarn: '#8c7b5a',
    roofHouse: '#6b5a42',
    door: '#c9cfc2',
    silo: '#dde3d6',
    dome: '#c4cbbd',
    cow: '#1f4422',
    window: '#cfd6c8',
    foreground: '#f1f8f1',
};

const night = {
    farHill: '#24473f',
    hillA: '#1c3d33',
    crest: '#3d6b58',
    hillB: '#22483a',
    hillC: '#1f4235',
    meadow: '#1d4a35',
    patch: '#2f6b4d',
    wall: '#8b94a3',
    roofBarn: '#4a4338',
    roofHouse: '#3b342b',
    door: '#6c7482',
    silo: '#8b94a3',
    dome: '#6c7482',
    cow: '#0b1a10',
    window: '#fddf8a',
    foreground: '#f1f8f1',
};

// A cow drawn from simple shapes. (x, y) is where its feet touch the ground.
function Cow({ x, y, scale = 1, grazing = false, flip = false, color }) {
    const sx = flip ? -scale : scale;

    return (
        <g transform={`translate(${x} ${y}) scale(${sx} ${scale})`} fill={color}>
            <rect x="0" y="-22" width="34" height="14" rx="6" />
            <rect x="4" y="-10" width="3" height="10" rx="1" />
            <rect x="10" y="-10" width="3" height="10" rx="1" />
            <rect x="24" y="-10" width="3" height="10" rx="1" />
            <rect x="30" y="-10" width="3" height="10" rx="1" />
            <g transform={grazing ? 'rotate(55 32 -18)' : undefined}>
                <rect x="30" y="-28" width="13" height="10" rx="4" />
                <rect x="31" y="-31" width="3" height="4" rx="1" />
            </g>
            <path d="M1,-19 Q-6,-16 -4,-6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </g>
    );
}

export default function FarmScene({ sky }) {
    const c = sky.night ? night : day;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {sky.night && (
                <svg className="absolute inset-0 h-full w-full">
                    {stars.map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r="1.5" fill="#ffffff" opacity="0.8" />
                    ))}
                </svg>
            )}

            <div
                className={`absolute right-[12%] top-8 h-16 w-16 animate-float rounded-full motion-reduce:animate-none ${bodyStyles[sky.body]}`}
            />

            {!sky.night &&
                clouds.map((cloud) => (
                    <div
                        key={cloud.top}
                        className={`absolute left-0 h-6 ${cloud.width} animate-drift rounded-full bg-white/40 blur-[1px] motion-reduce:animate-none`}
                        style={{ top: cloud.top, animationDuration: cloud.duration, animationDelay: cloud.delay }}
                    />
                ))}

            <svg
                viewBox="0 0 1440 220"
                preserveAspectRatio="xMidYMax slice"
                className="absolute inset-x-0 bottom-0 h-44 w-full sm:h-56"
            >
                {/* distant hills */}
                <path
                    d="M0,132 C200,112 380,122 560,128 C760,134 900,98 1100,92 C1260,88 1360,104 1440,98 L1440,220 L0,220 Z"
                    fill={c.farHill}
                />

                {/* big hill behind the barn, with a sunlit crest */}
                <path
                    d="M560,160 C700,100 880,84 1020,104 C1120,118 1180,140 1230,160 L1230,220 L560,220 Z"
                    fill={c.hillA}
                />
                <path
                    d="M600,140 C720,100 880,92 1000,108"
                    fill="none"
                    stroke={c.crest}
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.5"
                />

                {/* right hill and low left hill */}
                <path d="M1100,160 C1200,112 1320,96 1440,104 L1440,220 L1100,220 Z" fill={c.hillC} />
                <path
                    d="M0,160 C120,136 280,128 420,146 C480,154 520,160 560,164 L560,220 L0,220 Z"
                    fill={c.hillB}
                />

                {/* meadow */}
                <path
                    d="M0,160 C240,152 480,168 720,158 C960,148 1200,166 1440,154 L1440,220 L0,220 Z"
                    fill={c.meadow}
                />
                <ellipse cx="620" cy="182" rx="150" ry="5" fill={c.patch} opacity="0.5" />
                <ellipse cx="240" cy="190" rx="110" ry="4" fill={c.patch} opacity="0.45" />
                <ellipse cx="1000" cy="188" rx="170" ry="5" fill={c.patch} opacity="0.4" />

                {/* small house */}
                <rect x="868" y="140" width="46" height="18" fill={c.wall} />
                <polygon points="864,140 891,128 918,140" fill={c.roofHouse} />
                <rect x="878" y="148" width="7" height="10" fill={c.roofBarn} />
                <rect x="895" y="145" width="9" height="7" fill={c.window} />

                {/* barn */}
                <rect x="1010" y="112" width="120" height="46" fill={c.wall} />
                <polygon points="1002,114 1018,98 1122,98 1138,114" fill={c.roofBarn} />
                <rect x="1024" y="126" width="32" height="32" fill={c.door} />
                <line x1="1040" y1="126" x2="1040" y2="158" stroke={c.roofBarn} strokeWidth="1.5" opacity="0.5" />
                <rect x="1088" y="124" width="14" height="10" fill={c.window} />

                {/* silos */}
                <rect x="1150" y="122" width="16" height="36" fill={c.silo} />
                <ellipse cx="1158" cy="122" rx="8" ry="5" fill={c.dome} />
                <rect x="1170" y="122" width="16" height="36" fill={c.silo} />
                <ellipse cx="1178" cy="122" rx="8" ry="5" fill={c.dome} />

                {/* outbuilding */}
                <rect x="1196" y="140" width="58" height="18" fill={c.wall} />
                <polygon points="1192,140 1200,130 1250,130 1258,140" fill={c.roofHouse} />

                {/* the herd */}
                <Cow x={300} y={172} scale={1} color={c.cow} />
                <Cow x={420} y={176} scale={1.2} grazing color={c.cow} />
                <Cow x={560} y={170} scale={0.85} flip color={c.cow} />
                <Cow x={690} y={166} scale={0.7} grazing color={c.cow} />

                {/* soft edge into the page background */}
                <path
                    d="M0,206 C300,190 620,214 900,200 C1140,188 1300,210 1440,198 L1440,220 L0,220 Z"
                    fill={c.foreground}
                />
            </svg>
        </div>
    );
}
