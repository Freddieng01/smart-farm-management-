// Small line-icon set (24x24, stroke based). Usage: <Icon name="farm" className="h-5 w-5" />
// Icons inherit the surrounding text colour, so colour them with text-* classes.

const icons = {
    leaf: (
        <>
            <path d="M5 19c0-8 5-14 15-14 0 10-5 15-13 15" />
            <path d="M5 19c3-5 6-8 10-10" />
        </>
    ),
    chevron: <path d="M9 6l6 6-6 6" />,
    farm: (
        <>
            <path d="M3 21V10l9-6 9 6v11" />
            <path d="M3 21h18" />
            <path d="M9 21v-7h6v7" />
            <path d="M9 14l6 7M15 14l-6 7" />
        </>
    ),
    field: (
        <>
            <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
            <path d="M9 4v14M15 6v14" />
        </>
    ),
    area: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
    users: (
        <>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <circle cx="17.5" cy="9" r="2.5" />
            <path d="M17 14c2.6 0 4.5 1.8 4.5 4.5" />
        </>
    ),
    wallet: (
        <>
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16.5" cy="14.5" r="1" />
        </>
    ),
    hardhat: (
        <>
            <path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z" />
            <path d="M10 10V5a1 1 0 011-1h2a1 1 0 011 1v5" />
            <path d="M4 15v-3a6 6 0 016-6" />
            <path d="M14 6a6 6 0 016 6v3" />
        </>
    ),
    wheat: (
        <>
            <path d="M12 22V6" />
            <path d="M12 10c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4z" />
            <path d="M12 10c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" />
            <path d="M12 16c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4z" />
            <path d="M12 16c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" />
        </>
    ),
    trend: (
        <>
            <path d="M3 17l6-6 4 4 8-9" />
            <path d="M15 6h6v6" />
        </>
    ),
    paw: (
        <>
            <circle cx="6" cy="11" r="1.8" />
            <circle cx="10" cy="6.5" r="1.8" />
            <circle cx="14" cy="6.5" r="1.8" />
            <circle cx="18" cy="11" r="1.8" />
            <path d="M12 12c-3 0-5 2.5-5 5 0 2 1.5 3 3 3 1 0 1.5-.5 2-.5s1 .5 2 .5c1.5 0 3-1 3-3 0-2.5-2-5-5-5z" />
        </>
    ),
    bell: (
        <>
            <path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z" />
            <path d="M10 21h4" />
        </>
    ),
    truck: (
        <>
            <path d="M2 6h11v10H2z" />
            <path d="M13 9h4l3 3v4h-7z" />
            <circle cx="6.5" cy="18" r="1.8" />
            <circle cx="17" cy="18" r="1.8" />
        </>
    ),
    cart: (
        <>
            <path d="M3 4h3l2.5 11h10l2-8H7" />
            <circle cx="10" cy="19.5" r="1.5" />
            <circle cx="17" cy="19.5" r="1.5" />
        </>
    ),
    warehouse: (
        <>
            <path d="M3 9l9-5 9 5v11H3z" />
            <path d="M8 20v-7h8v7" />
            <path d="M8 16h8" />
        </>
    ),
    tasks: (
        <>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 4h6v3H9z" />
            <path d="M9 14l2 2 4-4" />
        </>
    ),
    factory: <path d="M4 20V8l5 3V8l5 3V6h6v14z" />,
    briefcase: (
        <>
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M9 7V5h6v2" />
            <path d="M3 13h18" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    seedling: (
        <>
            <path d="M12 21v-8" />
            <path d="M12 13c-4 0-6-2-6-6 4 0 6 2 6 6z" />
            <path d="M12 15c0-3 2-5 6-5 0 3-2 5-6 5z" />
            <path d="M5 21h14" />
        </>
    ),
    drop: <path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z" />,
    bug: (
        <>
            <ellipse cx="12" cy="14" rx="4" ry="5.5" />
            <path d="M12 8.5V4" />
            <path d="M8.5 11H4M15.5 11H20M8.5 16H4M15.5 16H20" />
            <path d="M9.5 6.5L8 4M14.5 6.5L16 4" />
        </>
    ),
    cloudsun: (
        <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1" />
            <path d="M7 20h10a4 4 0 000-8 5.5 5.5 0 00-10.3 1.5A3.3 3.3 0 007 20z" />
        </>
    ),
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </>
    ),
    cloud: <path d="M7 19h10a4.5 4.5 0 000-9 6 6 0 00-11.5 1.5A3.8 3.8 0 007 19z" />,
    rain: (
        <>
            <path d="M7 15h10a4.5 4.5 0 000-9 6 6 0 00-11.5 1.5A3.8 3.8 0 007 15z" />
            <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
        </>
    ),
    storm: (
        <>
            <path d="M7 14h10a4.5 4.5 0 000-9 6 6 0 00-11.5 1.5A3.8 3.8 0 007 14z" />
            <path d="M12 14l-2 4h3l-2 4" />
        </>
    ),
    wind: (
        <>
            <path d="M3 9h11a3 3 0 10-3-3" />
            <path d="M3 14h15a3 3 0 11-3 3" />
        </>
    ),
    alert: (
        <>
            <path d="M12 3l10 18H2z" />
            <path d="M12 10v4M12 17.5v.01" />
        </>
    ),
    basket: (
        <>
            <path d="M4 10h16l-1.5 9a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7z" />
            <path d="M8 10l3-6M16 10l-3-6" />
        </>
    ),
    package: (
        <>
            <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
        </>
    ),
    boxes: (
        <>
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
        </>
    ),
    wrench: (
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    ),
    banknote: (
        <>
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 10v4M18 10v4" />
        </>
    ),
    receipt: (
        <>
            <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
            <path d="M9 8h6M9 12h6" />
        </>
    ),
    chart: (
        <>
            <path d="M4 20V4" />
            <path d="M4 20h16" />
            <path d="M8 16v-5M12 16V8M16 16v-3" />
        </>
    ),
    shield: (
        <>
            <path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
        </>
    ),
    pin: (
        <>
            <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </>
    ),
    moon: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
    logout: (
        <>
            <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4" />
            <path d="M16 8l4 4-4 4M20 12H9" />
        </>
    ),
};

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.75 }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {icons[name] || icons.leaf}
        </svg>
    );
}
