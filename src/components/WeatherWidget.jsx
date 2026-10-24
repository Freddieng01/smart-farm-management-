import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const WeatherWidget = ({ farmId }) => {
    const { api } = useAuth();
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeatherData = async () => {
            if (!farmId) {
                setWeather(null);
                setForecast([]);
                setAlerts([]);
                setError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
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
            } finally {
                setLoading(false);
            }
        };

        fetchWeatherData();
    }, [api, farmId]);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading weather...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!farmId) return <div className="p-2 text-sm text-[#647260]">Register a mapped farm to see its local weather.</div>;
    if (!weather) return null;

    const dailyForecast = forecast.reduce((days, entry) => {
        const day = new Date(entry.dt * 1000).toLocaleDateString('en-CA');
        if (!days.some((existingEntry) => existingEntry.day === day)) {
            days.push({ ...entry, day });
        }
        return days;
    }, []).slice(0, 3);

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-blue-500 p-4 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>🌤️</span> Local Weather
                </h3>
            </div>

            <div className="p-4">
                {/* Intelligence Layer: Alerts */}
                {alerts.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-sm rounded">
                        <strong>⚠️ Agronomist Alert:</strong> {alerts[0].message}
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <span className="text-4xl font-bold text-gray-800">
                            {Math.round(weather.main?.temp)}°C
                        </span>
                        <p className="text-gray-500 capitalize">{weather.weather?.[0]?.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Humidity: {weather.main?.humidity}%</p>
                        <p className="text-sm text-gray-500">Wind: {weather.wind?.speed} m/s</p>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Next 3 Days</p>
                    <div className="grid grid-cols-3 gap-2">
                        {dailyForecast.map((day) => (
                            <div key={day.day} className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-xs font-medium text-gray-600">{new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                <p className="text-sm font-bold text-gray-800">{Math.round(day.main?.temp)}°C</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
