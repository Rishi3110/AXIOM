'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom icon for different issue types
const createCustomIcon = (category, status) => {
  let color = '#gray'
  switch (status) {
    case 'Submitted': color = '#fbbf24'; break
    case 'Acknowledged': color = '#3b82f6'; break
    case 'Resolved': color = '#10b981'; break
  }

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

// Heatmap layer component (simplified version using markers density)
function HeatmapLayer({ issues, showHeatmap }) {
  const map = useMap()
  
  useEffect(() => {
    if (!showHeatmap) return

    // Create a simple density visualization
    const heatmapPoints = issues
      .filter(issue => issue.coordinates)
      .map(issue => ({
        lat: issue.coordinates.lat,
        lng: issue.coordinates.lng,
        intensity: 1
      }))

    // This is a simplified heatmap representation
    // In a real implementation, you'd use plugins like leaflet.heat
    
  }, [issues, showHeatmap, map])

  return null
}

export default function MapComponent({ issues }) {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [userLocation, setUserLocation] = useState(null)

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to a central location if geolocation fails
          setUserLocation({ lat: 28.6139, lng: 77.2090 }) // Delhi, India
        }
      )
    } else {
      // Default location
      setUserLocation({ lat: 28.6139, lng: 77.2090 })
    }
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-yellow-500'
      case 'Acknowledged': return 'bg-blue-500'
      case 'Resolved': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (!userLocation) {
    return (
      <div className="h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-500/10">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
            Submitted
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
            Acknowledged
          </Badge>
          <Badge variant="outline" className="bg-green-500/10">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            Resolved
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          {showHeatmap ? 'Hide' : 'Show'} Heatmap
        </Button>
      </div>

      {/* Map Container */}
      <div className="h-96 rounded-lg overflow-hidden border">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Heatmap Layer */}
          <HeatmapLayer issues={issues} showHeatmap={showHeatmap} />
          
          {/* Issue Markers */}
          {issues
            .filter(issue => issue.coordinates)
            .map((issue) => (
              <Marker
                key={issue.id}
                position={[issue.coordinates.lat, issue.coordinates.lng]}
                icon={createCustomIcon(issue.category, issue.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm">{issue.id}</h3>
                      <Badge className={`${getStatusColor(issue.status)} text-white text-xs`}>
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      <strong>Category:</strong> {issue.category}
                    </p>
                    <p className="text-xs mb-2">{issue.description}</p>
                    <p className="text-xs text-gray-500">
                      📍 {issue.location}
                    </p>
                    <p className="text-xs text-gray-500">
                      📅 {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                    {issue.image_url && (
                      <div className="mt-2">
                        <img
                          src={issue.image_url}
                          alt="Issue"
                          className="w-full h-16 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                className: 'user-location-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">Your Location</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Map Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-muted rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{issues.length}</p>
          <p className="text-xs text-muted-foreground">Total Issues</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-2xl font-bold text-blue-500">
            {issues.filter(i => i.status === 'Acknowledged').length}
          </p>
          <p className="text-xs text-muted-foreground">Acknowledged</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-2xl font-bold text-green-500">
            {issues.filter(i => i.status === 'Resolved').length}
          </p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
      </div>
    </div>
  )
}