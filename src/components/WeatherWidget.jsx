import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';

const cardClass = 'rounded-3xl bg-white p-6 shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

function conditionIcon(main) {
    const m = (main || '').toLowerCase();
    if (m.includes('thunder')) return 'storm';
    if (m.includes('rain') || m.includes('drizzle')) return 'rain';
    if (m.includes('cloud')) return 'cloud';
    if (m.includes('clear')) return 'sun';
    return 'cloudsun';
}

const conditionTone = {
    sun: 'text-harvest-500',
    cloudsun: 'text-harvest-500',
    cloud: 'text-slate-400',
    rain: 'text-sky-500',
    storm: 'text-indigo-500',
};

// A simple rule of thumb for whether it is a good day to spray crops.
// Thresholds are easy to tune: wind above 4 m/s (about 14 km/h) risks drift,
// rain in the next ~12 hours washes product off, and very hot
// temperatures make spray evaporate. This is guidance, not agronomic advice.
function sprayAdvice(weather, forecast) {
    const wind = weather.wind?.speed ?? 0;
    const temp = weather.main?.temp ?? 0;
    const condition = (weather.weather?.[0]?.main || '').toLowerCase();
    const rainingNow = ['rain', 'drizzle', 'thunder'].some((word) => condition.includes(word));
    const rainSoon = forecast.slice(0, 4).some((entry) => (entry.pop ?? 0) >= 0.4);

    if (rainingNow || rainSoon) {
        return { good: false, text: 'Rain is likely soon, so hold off spraying today.' };
    }
    if (wind > 4) {
        return { good: false, text: 'Wind is strong and spray may drift. Wait for calmer conditions.' };
    }
    if (temp >= 32) {
        return { good: false, text: 'It is hot right now. Spray early in the morning or in the evening instead.' };
    }
    return { good: true, text: 'Good conditions for spraying: light wind and no rain expected.' };
}

function formatTime(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SunArc({ sunrise, sunset }) {
    const nowSeconds = Date.now() / 1000;
    const progress = (nowSeconds - sunrise) / (sunset - sunrise);
    const daylight = progress >= 0 && progress <= 1;
    const t = Math.min(Math.max(progress, 0), 1);
    const x = 120 - 110 * Math.cos(Math.PI * t);
    const y = 60 - 50 * Math.sin(Math.PI * t);

    return (
        <div>
            <svg viewBox="0 0 240 70" className="h-20 w-full" role="img" aria-label="Sun position between sunrise and sunset">
                <line x1="4" y1="60" x2="236" y2="60" stroke="#e2e8f0" strokeWidth="1" />
                <path d="M10,60 A110,50 0 0 1 230,60" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
                {daylight && (
                    <>
                        <circle cx={x} cy={y} r="11" fill="#fde68a" opacity="0.6" />
                        <circle cx={x} cy={y} r="6" fill="#f59e0b" />
                    </>
                )}
            </svg>
            <div className="flex justify-between text-sm">
                <div>
                    <p className="font-semibold text-farm-900 tabular-nums">{formatTime(sunrise)}</p>
                    <p className="text-xs text-slate-500">Sunrise</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-farm-900 tabular-nums">{formatTime(sunset)}</p>
                    <p className="text-xs text-slate-500">Sunset</p>
                </div>
            </div>
        </div>
    );
}

const WeatherWidget = ({ farmId }) => {
    const { api } = useAuth();
    const [weather, setWeather] = useState(null);
    const [farmName, setFarmName] = useState('');
    const [forecast, setForecast] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        const fetchWeatherData = async () => {
            if (!farmId) {
                setWeather(null);
                setForecast([]);
                setAlerts([]);
                setError(null);
                setDetail(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setDetail(null);
            try {
                const [currentResult, forecastResult, alertsResult] = await Promise.allSettled([
                    api.get(`/api/weather/current?farm_id=${farmId}`),
                    api.get(`/api/weather/forecast?farm_id=${farmId}`),
                    api.get(`/api/weather/alerts?farm_id=${farmId}`),
                ]);

                if (currentResult.status !== 'fulfilled') {
                    throw currentResult.reason;
                }

                setWeather(currentResult.value.data.weather);
                setFarmName(currentResult.value.data.farm || '');
                setForecast(
                    forecastResult.status === 'fulfilled'
                        ? forecastResult.value.data.forecast?.list || []
                        : []
                );
                setAlerts(
                    alertsResult.status === 'fulfilled'
                        ? alertsResult.value.data.alerts || []
                        : []
                );
            } catch (err) {
                setError(err.response?.data?.message || 'Weather data is currently unavailable.');
                setDetail(err.response?.data?.error || null);
            } finally {
                setLoading(false);
            }
        };

        fetchWeatherData();
    }, [api, farmId]);

    if (loading) {
        return (
            <div className={cardClass} aria-label="Loading weather">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-32 rounded bg-slate-100" />
                    <div className="h-14 w-40 rounded bg-slate-100" />
                    <div className="h-16 rounded bg-slate-100" />
                    <div className="h-20 rounded bg-slate-100" />
                </div>
            </div>
        );
    }

    if (!farmId) {
        return (
            <div className={cardClass}>
                <p className="text-sm text-slate-500">Register a mapped farm to see its local weather.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cardClass}>
                <div className="flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
                    <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-medium">{error}</p>
                        {import.meta.env.DEV && detail && <p className="mt-1 text-xs text-red-700/80">{detail}</p>}
                    </div>
                </div>
            </div>
        );
    }

    if (!weather) return null;

    const icon = conditionIcon(weather.weather?.[0]?.main);
    const advice = sprayAdvice(weather, forecast);
    const hasSun = Number(weather.sys?.sunrise) > 0 && Number(weather.sys?.sunset) > 0;

    const dailyForecast = forecast
        .reduce((days, entry) => {
            const day = new Date(entry.dt * 1000).toLocaleDateString('en-CA');
            if (!days.some((existingEntry) => existingEntry.day === day)) {
                days.push({ ...entry, day });
            }
            return days;
        }, [])
        .slice(0, 3);

    return (
        <div className={cardClass}>
            {alerts.length > 0 && (
                <div className="mb-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{alerts[0].message}</span>
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        <Icon name="pin" className="h-4 w-4 shrink-0 text-farm-600" />
                        <span className="truncate">{farmName || 'Your farm'}</span>
                    </p>
                    <p className="mt-3 text-5xl font-semibold tracking-tight text-farm-900 tabular-nums">
                        {Math.round(weather.main?.temp)}
                        <span className="text-3xl font-medium text-slate-400">&deg;C</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500 tabular-nums">
                        H: {Math.round(weather.main?.temp_max)}&deg;&nbsp;&nbsp;L: {Math.round(weather.main?.temp_min)}&deg;
                    </p>
                </div>
                <div className="text-center">
                    <Icon name={icon} className={`mx-auto h-16 w-16 ${conditionTone[icon]}`} strokeWidth={1.3} />
                    <p className="mt-1 text-sm capitalize text-slate-500">{weather.weather?.[0]?.description}</p>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-dashed border-slate-200 pt-4">
                <div>
                    <dt className="text-xs text-slate-500">Humidity</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-farm-900 tabular-nums">{weather.main?.humidity}%</dd>
                </div>
                <div>
                    <dt className="text-xs text-slate-500">Rain</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-farm-900 tabular-nums">{weather.rain?.['1h'] ?? 0} mm</dd>
                </div>
                <div>
                    <dt className="text-xs text-slate-500">Pressure</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-farm-900 tabular-nums">{weather.main?.pressure} hPa</dd>
                </div>
                <div>
                    <dt className="text-xs text-slate-500">Wind</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-farm-900 tabular-nums">{weather.wind?.speed} m/s</dd>
                </div>
            </dl>

            {hasSun && (
                <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
                    <SunArc sunrise={weather.sys.sunrise} sunset={weather.sys.sunset} />
                </div>
            )}

            <div
                className={`mt-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                    advice.good ? 'bg-farm-800 text-white' : 'bg-amber-100 text-amber-900'
                }`}
            >
                <Icon name={advice.good ? 'leaf' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{advice.text}</p>
            </div>

            {dailyForecast.length > 0 && (
                <div className="mt-5">
                    <p className="mb-2 text-sm font-medium text-slate-500">Next 3 days</p>
                    <div className="grid grid-cols-3 gap-2">
                        {dailyForecast.map((day) => {
                            const dayIcon = conditionIcon(day.weather?.[0]?.main);
                            return (
                                <div key={day.day} className="rounded-2xl bg-farm-50 px-2 py-3 text-center">
                                    <p className="text-xs text-slate-500">
                                        {new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </p>
                                    <Icon name={dayIcon} className={`mx-auto my-1.5 h-6 w-6 ${conditionTone[dayIcon]}`} />
                                    <p className="text-sm font-semibold text-farm-900 tabular-nums">
                                        {Math.round(day.main?.temp)}&deg;C
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
