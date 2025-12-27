"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, RotateCcw, Star } from "lucide-react"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <p className="text-muted-foreground">지도를 불러오는 중...</p>
    </div>
  ),
})

export interface Location {
  lat: number
  lng: number
  personNumber: 1 | 2 | 3
}

export default function HomePage() {
  const [locations, setLocations] = useState<Location[]>([])

  const handleMapClick = (lat: number, lng: number) => {
    const nextPersonNumber = (locations.length + 1) as 1 | 2 | 3

    if (nextPersonNumber > 3) {
      return
    }

    const newLocation: Location = {
      lat,
      lng,
      personNumber: nextPersonNumber,
    }

    setLocations([...locations, newLocation])
  }

  const handleReset = () => {
    setLocations([])
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">TRITRY</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 border-b lg:border-r lg:border-b-0 bg-card">
          <div className="p-6 space-y-6">
            {/* Status Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">위치 지정 : </p>
                    <p className="text-2xl font-bold text-primary">{locations.length}/3</p>
                    <p className="text-xs text-muted-foreground">지도를 클릭하여 3개의 위치를 지정하세요</p>
                  </div>

                  {/* Location List */}
                  {locations.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium">지정된 위치</p>
                      <div className="space-y-2">
                        {locations.map((loc) => {
                          const colors = ["text-red-500", "text-blue-500", "text-green-500"]
                          return (
                            <div key={loc.personNumber} className="flex items-center gap-2 text-xs">
                              <MapPin className={`h-3 w-3 ${colors[loc.personNumber - 1]}`} />
                              <span>
                                Person {loc.personNumber}: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Result Card */}
            {locations.length === 3 && <ResultCard locations={locations} />}

            {/* Reset Button */}
            {locations.length > 0 && (
              <Button variant="outline" onClick={handleReset} className="w-full gap-2 bg-transparent">
                <RotateCcw className="h-4 w-4" />
                초기화
              </Button>
            )}
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 h-[500px] lg:h-auto">
          <MapComponent locations={locations} onMapClick={handleMapClick} />
        </div>
      </main>
    </div>
  )
}

function ResultCard({ locations }: { locations: Location[] }) {
  const [circumcenter, setCircumcenter] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState<number | null>(null)

  useEffect(() => {
    if (locations.length === 3) {
      const result = calculateCircumcenter(locations)
      setCircumcenter(result.circumcenter)
      setRadius(result.radius)
    }
  }, [locations])

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <p className="font-semibold">여기서 만나자...</p>
          </div>
          {circumcenter && radius && (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">외심 좌표</p>
                <p className="font-mono text-xs">
                  {circumcenter.lat.toFixed(6)}, {circumcenter.lng.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">반지름</p>
                <p className="font-semibold">{radius.toFixed(2)} km</p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">ㅎㅎ</p>
              <p className="text-muted-foreground">
                추천 영상: https://www.youtube.com/shorts/UytoZWPLyZ4
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Calculate circumcenter of a triangle
function calculateCircumcenter(locations: Location[]) {
  const [p1, p2, p3] = locations

  // Convert lat/lng to local Cartesian coordinates (meters)
  const originLat = p1.lat
  const originLng = p1.lng

  const toCartesian = (lat: number, lng: number) => {
    const R = 6371000 // Earth's radius in meters
    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180
    const originLatRad = (originLat * Math.PI) / 180
    const originLngRad = (originLng * Math.PI) / 180

    // Project to meters using equirectangular approximation
    const x = R * (lngRad - originLngRad) * Math.cos((latRad + originLatRad) / 2)
    const y = R * (latRad - originLatRad)

    return { x, y }
  }

  const fromCartesian = (x: number, y: number) => {
    const R = 6371000 // Earth's radius in meters
    const originLatRad = (originLat * Math.PI) / 180
    const originLngRad = (originLng * Math.PI) / 180

    const latRad = y / R + originLatRad
    const lngRad = x / (R * Math.cos((latRad + originLatRad) / 2)) + originLngRad

    return {
      lat: (latRad * 180) / Math.PI,
      lng: (lngRad * 180) / Math.PI,
    }
  }

  // Convert all points to Cartesian
  const c1 = toCartesian(p1.lat, p1.lng)
  const c2 = toCartesian(p2.lat, p2.lng)
  const c3 = toCartesian(p3.lat, p3.lng)

  // Calculate circumcenter in Cartesian coordinates
  const x1 = c1.x
  const y1 = c1.y
  const x2 = c2.x
  const y2 = c2.y
  const x3 = c3.x
  const y3 = c3.y

  // Calculate D = 2(x1(y2-y3) + x2(y3-y1) + x3(y1-y2))
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))

  // Handle degenerate case (collinear points)
  if (Math.abs(D) < 0.0001) {
    return {
      circumcenter: {
        lat: (p1.lat + p2.lat + p3.lat) / 3,
        lng: (p1.lng + p2.lng + p3.lng) / 3,
      },
      radius: 0,
    }
  }

  // Calculate circumcenter coordinates using the formula
  const x1Sq = x1 * x1 + y1 * y1
  const x2Sq = x2 * x2 + y2 * y2
  const x3Sq = x3 * x3 + y3 * y3

  const ux = (x1Sq * (y2 - y3) + x2Sq * (y3 - y1) + x3Sq * (y1 - y2)) / D
  const uy = (x1Sq * (x3 - x2) + x2Sq * (x1 - x3) + x3Sq * (x2 - x1)) / D

  // Convert back to lat/lng
  const circumcenter = fromCartesian(ux, uy)

  // Calculate radius using Haversine formula from circumcenter to each point
  const R = 6371 // Earth's radius in km

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const radius1 = haversineDistance(circumcenter.lat, circumcenter.lng, p1.lat, p1.lng)
  const radius2 = haversineDistance(circumcenter.lat, circumcenter.lng, p2.lat, p2.lng)
  const radius3 = haversineDistance(circumcenter.lat, circumcenter.lng, p3.lat, p3.lng)

  // Use average of the three radii for final radius
  const radius = (radius1 + radius2 + radius3) / 3

  return { circumcenter, radius }
}
