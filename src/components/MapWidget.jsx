import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useAuth } from '../context/AuthContext.jsx';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EditControl = ({ onPolygonCreated }) => {
    const map = useMap();
    const drawnItems = useRef(new L.FeatureGroup());

    useEffect(() => {
        const featureGroup = drawnItems.current;
        map.addLayer(featureGroup);

        const drawControl = new L.Control.Draw({
            draw: {
                polygon: true,
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup,
                remove: true,
            },
        });
        map.addControl(drawControl);

        const onCreated = (event) => {
            const { layerType, layer } = event;
            if (layerType === 'polygon') {
                featureGroup.clearLayers();
                featureGroup.addLayer(layer);
                const coordinates = layer.getLatLngs()[0].map((latLng) => [latLng.lat, latLng.lng]);

                onPolygonCreated(coordinates, calculatePolygonArea(coordinates) / 10000);
            }
        };

        map.on(L.Draw.Event.CREATED, onCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, onCreated);
            map.removeControl(drawControl);
            map.removeLayer(featureGroup);
        };
    }, [map, onPolygonCreated]);

    return null;
};

function calculatePolygonArea(coordinates) {
    const earthRadius = 6378137;
    let area = 0;
    for (let index = 0; index < coordinates.length; index += 1) {
        const nextIndex = (index + 1) % coordinates.length;
        const [latitude, longitude] = coordinates[index];
        const [nextLatitude, nextLongitude] = coordinates[nextIndex];
        area += (nextLongitude - longitude) * (2 + Math.sin(latitude * Math.PI / 180) + Math.sin(nextLatitude * Math.PI / 180));
    }
    return Math.abs(area * earthRadius * earthRadius / 2);
}

const MapWidget = ({ farmId }) => {
    const { api } = useAuth();
    const [farm, setFarm] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tilesUnavailable, setTilesUnavailable] = useState(false);

    const fetchMapData = useCallback(async () => {
        if (!farmId) {
            setFarm(null);
            setFields([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const fetchData = async () => {
            try {
                const [farmResponse, fieldsResponse] = await Promise.all([
                    api.get(`/api/farms/${farmId}`),
                    api.get(`/api/farms/${farmId}/fields`),
                ]);
                setFarm(farmResponse.data.data);
                setFields(fieldsResponse.data.data || []);
            } catch (err) {
                console.error('Error loading map data', err);
                setFarm(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [api, farmId]);

    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    useEffect(() => {
        setTilesUnavailable(false);
    }, [farmId]);

    const handlePolygonCreated = useCallback(async (coordinates, area) => {
        const fieldName = prompt('Enter field name:');
        if (!fieldName) return;

        try {
            await api.post(`/api/farms/${farmId}/fields`, {
                name: fieldName,
                size_hectares: area,
                boundary_polygon: JSON.stringify(coordinates),
            });
            alert('Field plotted successfully!');
            setIsDrawing(false);
            fetchMapData();
        } catch (err) {
            console.error('Error saving field', err);
            alert(err.response?.data?.message || 'Failed to save field.');
        }
    }, [api, farmId, fetchMapData]);

    if (loading) return <div className="p-4 text-center">Loading map...</div>;
    if (!farmId) return <div className="p-4 text-center text-[#647260]">Register a farm and place it on the map to view its location.</div>;
    if (!farm) return <div className="p-4 text-center text-red-600">Unable to load this farm map.</div>;

    const legacyCoordinates = farm.location_gps?.split(',').map(Number);
    const latitude = Number(farm.latitude ?? legacyCoordinates?.[0]);
    const longitude = Number(farm.longitude ?? legacyCoordinates?.[1]);
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (!hasLocation) {
        return <div className="p-4 text-center text-[#647260]">This farm has not been mapped yet. Open Farm Management and place it on the map.</div>;
    }

    const center = [latitude, longitude];

    return (
        <div className="relative h-[500px] w-full rounded-xl overflow-hidden shadow-md border border-gray-200">
            <div className="absolute top-4 right-4 z-[1000]">
                <button
                    onClick={() => setIsDrawing(!isDrawing)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition ${isDrawing ? 'bg-red-500 text-white' : 'bg-white text-gray-800 shadow-sm border'}`}
                >
                    {isDrawing ? 'Cancel Drawing' : 'Plot New Field'}
                </button>
            </div>
            <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{ tileerror: () => setTilesUnavailable(true) }}
                />
                <Marker position={center}>
                    <Popup>
                        <strong className="text-green-700">{farm.name}</strong> <br />
                        Main Farm Hub
                    </Popup>
                </Marker>
                {fields.map((field) => {
                    if (!field.boundary_polygon) return null;
                    try {
                        const coords = JSON.parse(field.boundary_polygon);
                        return (
                            <Polygon
                                key={field.id}
                                positions={coords}
                                pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.4 }}
                            >
                                <Popup>
                                    <strong className="text-green-700">{field.name}</strong> <br />
                                    Size: {field.size_hectares} ha
                                </Popup>
                            </Polygon>
                        );
                    } catch (e) {
                        return null;
                    }
                })}
                {isDrawing && <EditControl onPolygonCreated={handlePolygonCreated} farmId={farmId} />}
            </MapContainer>
            {tilesUnavailable && (
                <p className="pointer-events-none absolute inset-x-4 bottom-4 z-[1000] rounded-md bg-white/95 px-3 py-2 text-center text-xs text-[#4d3323] shadow">
                    OpenStreetMap imagery could not load. Check this device’s Internet connection or trusted network certificate.
                </p>
            )}
        </div>
    );
};

export default MapWidget;
