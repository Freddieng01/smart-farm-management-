import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_CENTER = [-15.3875, 28.3228];

function MapClickHandler({ onLocationChange }) {
    useMapEvents({
        click(event) {
            onLocationChange([event.latlng.lat, event.latlng.lng]);
        },
    });

    return null;
}

function MapViewport({ position }) {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, Math.max(map.getZoom(), 15));
        }
    }, [map, position]);

    return null;
}

export default function FarmLocationPicker({ latitude, longitude, onLocationChange }) {
    const [locationError, setLocationError] = useState(null);
    const [tilesUnavailable, setTilesUnavailable] = useState(false);
    const position = latitude !== null && latitude !== undefined
        && longitude !== null && longitude !== undefined
        && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
        ? [Number(latitude), Number(longitude)]
        : null;

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            setLocationError('Location services are not supported by this browser. Click the map to place your farm.');
            return;
        }

        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => onLocationChange([coords.latitude, coords.longitude]),
            () => setLocationError('We could not access your location. Check browser permission or click the map to place your farm.'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#243322]">Place your farm on the map</p>
                <button
                    className="rounded-md border border-[#cbd8ca] px-3 py-1.5 text-xs font-medium text-[#315f2b] hover:bg-[#eef5ee]"
                    onClick={useCurrentLocation}
                    type="button"
                >
                    Use my location
                </button>
            </div>
            <p className="mb-2 text-xs text-[#647260]">Click the map at your farm entrance or centre. This location powers the map and local weather.</p>
            <div className="relative h-64 overflow-hidden rounded-md border border-[#cbd8ca]">
                <MapContainer center={position || DEFAULT_CENTER} zoom={position ? 15 : 6} className="h-full w-full">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        eventHandlers={{ tileerror: () => setTilesUnavailable(true) }}
                    />
                    <MapViewport position={position} />
                    <MapClickHandler onLocationChange={onLocationChange} />
                    {position && <Marker position={position} />}
                </MapContainer>
                {tilesUnavailable && (
                    <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md bg-white/95 px-3 py-2 text-xs text-[#4d3323] shadow">
                        Map imagery could not load. Check this device’s Internet connection or trusted network certificate; you can still select a location by clicking the map.
                    </p>
                )}
            </div>
            {position && <p className="mt-2 text-xs font-medium text-[#315f2b]">Farm location selected.</p>}
            {locationError && <p className="mt-2 text-xs text-red-600">{locationError}</p>}
        </div>
    );
}
