import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function WeatherManagement() {
    const { api } = useAuth();

    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState('');
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [alerts, setAlerts] = useState([]);

    const [loadingFarms, setLoadingFarms] = useState(true);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [error, setError] = useState('');

    const getRows = (response) => {
        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (Array.isArray(response?.data?.data)) {
            return response.data.data;
        }

        return [];
    };

    const getErrorMessage = (err, fallback) => {
        return (
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            fallback
        );
    };

    const loadFarms = useCallback(async () => {
        setLoadingFarms(true);
        setError('');

        try {
            const response = await api.get('/api/farms');
            const farmRows = getRows(response);

            setFarms(farmRows);

            if (farmRows.length > 0) {
                setSelectedFarm((current) => current || String(farmRows[0].id));
            }
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    'Unable to load farms.'
                )
            );
        } finally {
            setLoadingFarms(false);
        }
    }, [api]);

    const loadWeather = useCallback(async () => {
        if (!selectedFarm) {
            return;
        }

        setLoadingWeather(true);
        setError('');

        try {
            const [currentResponse, forecastResponse, alertsResponse] =
                await Promise.all([
                    api.get('/api/weather/current', {
                        params: { farm_id: selectedFarm },
                    }),
                    api.get('/api/weather/forecast', {
                        params: { farm_id: selectedFarm },
                    }),
                    api.get('/api/weather/alerts', {
                        params: { farm_id: selectedFarm },
                    }),
                ]);

            setCurrentWeather(currentResponse.data);
            setForecast(forecastResponse.data);

            const alertData = alertsResponse.data?.alerts;
            setAlerts(Array.isArray(alertData) ? alertData : []);
        } catch (err) {
            setCurrentWeather(null);
            setForecast(null);
            setAlerts([]);

            setError(
                getErrorMessage(
                    err,
                    'Unable to retrieve weather information.'
                )
            );
        } finally {
            setLoadingWeather(false);
        }
    }, [api, selectedFarm]);

    useEffect(() => {
        loadFarms();
    }, [loadFarms]);

    useEffect(() => {
        if (selectedFarm) {
            loadWeather();
        }
    }, [selectedFarm, loadWeather]);

    const weather = currentWeather?.weather;
    const forecastItems = forecast?.forecast?.list || [];

    const formatDateTime = (dateTime) => {
        if (!dateTime) {
            return 'N/A';
        }

        const date = new Date(dateTime.replace(' ', 'T'));

        if (Number.isNaN(date.getTime())) {
            return dateTime;
        }

        return date.toLocaleString();
    };

    const getWeatherIcon = (icon) => {
        if (!icon) {
            return '🌤️';
        }

        return `https://openweathermap.org/img/wn/${icon}@2x.png`;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Weather Management
                    </h1>

                    <p className="text-gray-600 mt-1">
                        Monitor current weather, forecasts and weather alerts
                        for your farms.
                    </p>
                </div>

                {/* Farm selector */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
                    <label
                        htmlFor="farm"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Select Farm
                    </label>

                    <select
                        id="farm"
                        value={selectedFarm}
                        onChange={(e) => setSelectedFarm(e.target.value)}
                        disabled={loadingFarms || loadingWeather}
                        className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#315f2b]"
                    >
                        <option value="">
                            {loadingFarms
                                ? 'Loading farms...'
                                : 'Select a farm'}
                        </option>

                        {farms.map((farm) => (
                            <option key={farm.id} value={farm.id}>
                                {farm.name}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {loadingWeather && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center mb-6">
                        <p className="text-gray-600">
                            Loading weather information...
                        </p>
                    </div>
                )}

                {!loadingWeather && weather && (
                    <>
                        {/* Current weather */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Current Weather
                                    </h2>

                                    <p className="text-gray-500">
                                        {currentWeather?.farm || 'Selected farm'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {weather.weather?.[0]?.icon ? (
                                        <img
                                            src={getWeatherIcon(
                                                weather.weather[0].icon
                                            )}
                                            alt={
                                                weather.weather?.[0]?.description ||
                                                'Weather'
                                            }
                                            className="w-16 h-16"
                                        />
                                    ) : (
                                        <span className="text-4xl">
                                            🌤️
                                        </span>
                                    )}

                                    <div>
                                        <p className="text-4xl font-bold text-gray-900">
                                            {weather.main?.temp ?? 'N/A'}°C
                                        </p>

                                        <p className="text-gray-600 capitalize">
                                            {weather.weather?.[0]?.description ||
                                                'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">
                                        Feels Like
                                    </p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {weather.main?.feels_like ?? 'N/A'}°C
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">
                                        Humidity
                                    </p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {weather.main?.humidity ?? 'N/A'}%
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">
                                        Wind Speed
                                    </p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {weather.wind?.speed ?? 'N/A'} m/s
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">
                                        Pressure
                                    </p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {weather.main?.pressure ?? 'N/A'} hPa
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Weather alerts */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Weather Alerts
                                    </h2>

                                    <p className="text-sm text-gray-500">
                                        Conditions identified from the forecast
                                    </p>
                                </div>

                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                    {alerts.length} alert
                                    {alerts.length === 1 ? '' : 's'}
                                </span>
                            </div>

                            {alerts.length === 0 ? (
                                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
                                    No weather alerts detected.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map((alert, index) => (
                                        <div
                                            key={`${alert.type}-${alert.date_time}-${index}`}
                                            className={`rounded-lg p-4 border ${
                                                alert.severity === 'high'
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-yellow-50 border-yellow-200'
                                            }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {alert.message}
                                                    </p>

                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {formatDateTime(
                                                            alert.date_time
                                                        )}
                                                    </p>
                                                </div>

                                                <span className="uppercase text-xs font-bold">
                                                    {alert.severity}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Forecast */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Weather Forecast
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Upcoming forecast information for the
                                    selected farm
                                </p>
                            </div>

                            {forecastItems.length === 0 ? (
                                <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                                    No forecast information is available.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {forecastItems.slice(0, 10).map((item, index) => (
                                        <div
                                            key={`${item.dt}-${index}`}
                                            className="border border-gray-200 rounded-lg p-4"
                                        >
                                            <p className="text-sm font-medium text-gray-700">
                                                {formatDateTime(item.dt_txt)}
                                            </p>

                                            <div className="flex items-center gap-2 my-3">
                                                {item.weather?.[0]?.icon ? (
                                                    <img
                                                        src={getWeatherIcon(
                                                            item.weather[0].icon
                                                        )}
                                                        alt={
                                                            item.weather?.[0]
                                                                ?.description ||
                                                            'Weather'
                                                        }
                                                        className="w-12 h-12"
                                                    />
                                                ) : (
                                                    <span className="text-2xl">
                                                        🌤️
                                                    </span>
                                                )}

                                                <span className="text-2xl font-bold text-gray-900">
                                                    {item.main?.temp ?? 'N/A'}°C
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-600 capitalize mb-3">
                                                {item.weather?.[0]?.description ||
                                                    'N/A'}
                                            </p>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p>
                                                    Humidity:{' '}
                                                    {item.main?.humidity ?? 'N/A'}%
                                                </p>

                                                <p>
                                                    Wind:{' '}
                                                    {item.wind?.speed ?? 'N/A'} m/s
                                                </p>

                                                <p>
                                                    Rain probability:{' '}
                                                    {Math.round(
                                                        (item.pop ?? 0) * 100
                                                    )}
                                                    %
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!loadingFarms &&
                    farms.length === 0 &&
                    !error && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                            No farms are available. Create a farm with GPS
                            coordinates before using Weather Management.
                        </div>
                    )}
            </div>
        </div>
    );
}