// The header sky follows the clock (always in the brand greens).
// Same logic as the dashboard, kept here so module pages can share it.
export function getSky(date) {
    const hour = date.getHours() + date.getMinutes() / 60;
    let greeting = 'Good evening';
    if (hour < 5) greeting = 'Working late';
    else if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    if (hour < 5 || hour >= 20) {
        return { phase: 'night', night: true, hour, greeting, gradient: 'from-[#04140d] via-[#082a1b] to-[#0d3a26]' };
    }
    if (hour < 8) {
        return { phase: 'dawn', night: false, hour, greeting, gradient: 'from-[#0a3524] via-[#1d6b4a] to-[#d9a05b]' };
    }
    if (hour < 17) {
        return { phase: 'day', night: false, hour, greeting, gradient: 'from-[#0a3f25] via-[#0f6b3a] to-[#26965f]' };
    }
    return { phase: 'dusk', night: false, hour, greeting, gradient: 'from-[#0a3524] via-[#3f6a52] to-[#d0795c]' };
}
