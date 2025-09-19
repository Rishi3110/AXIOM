'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import { RefreshCw, BarChart3 } from "lucide-react"

// Dynamic import for react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// Dynamic import for leaflet
let L = null
if (typeof window !== 'undefined') {
  L = require('leaflet')
  
  // Fix for default markers in react-leaflet
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Custom icon for different issue types
const createCustomIcon = (percentage, color) => {
  const size = Math.max(20, Math.min(50, 20 + (percentage * 30 / 100)))
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white;">${Math.round(percentage)}%</div>`,
    className: 'custom-area-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

export default function AdminMap() {
  const [issues, setIssues] = useState([])
  const [areaData, setAreaData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]) // Default to Delhi

  useEffect(() => {
    loadIssues()
  }, [])

  useEffect(() => {
    if (issues.length > 0) {
      processAreaData()
      calculateMapCenter()
    }
  }, [issues, selectedStatus])

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIssues(data || [])
    } catch (error) {
      console.error('Failed to load issues:', error)
      toast.error('Failed to load issues for map')
    } finally {
      setLoading(false)
    }
  }

  const extractCityFromLocation = (location) => {
    if (!location) return 'Unknown'
    
    // Simple city extraction logic - can be enhanced
    const parts = location.split(',')
    if (parts.length > 1) {
      // Try to get city name (usually the second-to-last part)
      const cityCandidate = parts[parts.length - 2]?.trim()
      if (cityCandidate && cityCandidate.length > 2) {
        return cityCandidate
      }
    }
    
    // Fallback: use first part or first 20 characters
    return parts[0]?.trim().substring(0, 20) || 'Unknown'
  }

  const processAreaData = () => {
    const areaMap = new Map()

    // Filter issues based on selected status
    const filteredIssues = selectedStatus === 'all' 
      ? issues 
      : issues.filter(issue => issue.status === selectedStatus)

    // Group issues by area/city
    issues.forEach(issue => {
      const area = extractCityFromLocation(issue.location)
      if (!areaMap.has(area)) {
        areaMap.set(area, {
          area,
          total: 0,
          submitted: 0,
          acknowledged: 0,
          resolved: 0,
          coordinates: issue.coordinates || null,
          issues: []
        })
      }

      const areaStats = areaMap.get(area)
      areaStats.total++
      areaStats.issues.push(issue)

      // Update coordinates if we don't have them yet
      if (!areaStats.coordinates && issue.coordinates) {
        areaStats.coordinates = issue.coordinates
      }

      // Count by status
      switch (issue.status) {
        case 'Submitted':
          areaStats.submitted++
          break
        case 'Acknowledged':
          areaStats.acknowledged++
          break
        case 'Resolved':
          areaStats.resolved++
          break
      }
    })

    // Convert to array and calculate percentages
    const areaDataArray = Array.from(areaMap.values()).map(area => {
      const total = area.total
      return {
        ...area,
        submittedPercentage: total > 0 ? (area.submitted / total) * 100 : 0,
        acknowledgedPercentage: total > 0 ? (area.acknowledged / total) * 100 : 0,
        resolvedPercentage: total > 0 ? (area.resolved / total) * 100 : 0
      }
    }).filter(area => area.coordinates) // Only include areas with coordinates

    setAreaData(areaDataArray)
  }

  const calculateMapCenter = () => {
    const validCoordinates = issues
      .filter(issue => issue.coordinates)
      .map(issue => issue.coordinates)

    if (validCoordinates.length > 0) {
      const avgLat = validCoordinates.reduce((sum, coord) => sum + coord.lat, 0) / validCoordinates.length
      const avgLng = validCoordinates.reduce((sum, coord) => sum + coord.lng, 0) / validCoordinates.length
      setMapCenter([avgLat, avgLng])
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return '#fbbf24'
      case 'Acknowledged': return '#3b82f6'
      case 'Resolved': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getAreaColor = (area, selectedStatus) => {
    if (selectedStatus === 'all') {
      // For all statuses, use color based on resolution rate
      const resolutionRate = area.resolvedPercentage
      if (resolutionRate > 70) return '#10b981' // Green
      if (resolutionRate > 40) return '#fbbf24' // Yellow
      return '#ef4444' // Red
    }
    
    return getStatusColor(selectedStatus)
  }

  const getAreaPercentage = (area, selectedStatus) => {
    switch (selectedStatus) {
      case 'Submitted': return area.submittedPercentage
      case 'Acknowledged': return area.acknowledgedPercentage
      case 'Resolved': return area.resolvedPercentage
      default: return area.resolvedPercentage // Default to resolution rate
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Interactive Map</h2>
          <p className="text-slate-600">Geographic visualization of civic issues by area</p>
        </div>
        <Button onClick={loadIssues} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Map Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">View Mode:</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48 ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Resolution Rate</SelectItem>
                  <SelectItem value="Submitted">Submitted Issues</SelectItem>
                  <SelectItem value="Acknowledged">Acknowledged Issues</SelectItem>
                  <SelectItem value="Resolved">Resolved Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 ml-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm">High (70%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Medium (40-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm">Low (0-40%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Area markers showing percentages */}
              {areaData.map((area, index) => (
                <Marker
                  key={`area-${index}`}
                  position={[area.coordinates.lat, area.coordinates.lng]}
                  icon={createCustomIcon(
                    getAreaPercentage(area, selectedStatus),
                    getAreaColor(area, selectedStatus)
                  )}
                >
                  <Popup className="custom-popup" maxWidth={300}>
                    <div className="p-3">
                      <h3 className="font-bold text-lg mb-3">{area.area}</h3>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center bg-slate-50 rounded p-2">
                          <div className="text-2xl font-bold text-slate-800">{area.total}</div>
                          <div className="text-xs text-slate-600">Total Issues</div>
                        </div>
                        <div className="text-center bg-green-50 rounded p-2">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(area.resolvedPercentage)}%
                          </div>
                          <div className="text-xs text-slate-600">Resolved</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Submitted:</span>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{area.submitted}</div>
                            <Badge className="bg-yellow-500 text-white text-xs">
                              {Math.round(area.submittedPercentage)}%
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Acknowledged:</span>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{area.acknowledged}</div>
                            <Badge className="bg-blue-500 text-white text-xs">
                              {Math.round(area.acknowledgedPercentage)}%
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Resolved:</span>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{area.resolved}</div>
                            <Badge className="bg-green-500 text-white text-xs">
                              {Math.round(area.resolvedPercentage)}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          Click area name to view detailed issues
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Area Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Area Statistics</CardTitle>
          <CardDescription>Breakdown of issues by geographical area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Area</th>
                  <th className="text-center p-2">Total</th>
                  <th className="text-center p-2">Submitted</th>
                  <th className="text-center p-2">Acknowledged</th>
                  <th className="text-center p-2">Resolved</th>
                  <th className="text-center p-2">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {areaData
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 10)
                  .map((area, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{area.area}</td>
                    <td className="text-center p-2">{area.total}</td>
                    <td className="text-center p-2">
                      <Badge className="bg-yellow-500 text-white">
                        {area.submitted} ({Math.round(area.submittedPercentage)}%)
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge className="bg-blue-500 text-white">
                        {area.acknowledged} ({Math.round(area.acknowledgedPercentage)}%)
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge className="bg-green-500 text-white">
                        {area.resolved} ({Math.round(area.resolvedPercentage)}%)
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded text-white text-xs font-medium ${
                        area.resolvedPercentage > 70 ? 'bg-green-500' :
                        area.resolvedPercentage > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {Math.round(area.resolvedPercentage)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {areaData.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No area data available. Issues need location coordinates to appear on the map.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}