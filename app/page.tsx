"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Users, User, Copy, RotateCcw, Star, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <p className="text-muted-foreground">지도를 불러오는 중...</p>
    </div>
  ),
})

type Mode = "solo" | "collaborative"

export interface Location {
  lat: number
  lng: number
  personNumber: 1 | 2 | 3
}

interface SessionData {
  id: string
  locations: Location[]
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("solo")
  const [locations, setLocations] = useState<Location[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionParam = urlParams.get("session")

    if (sessionParam) {
      setMode("collaborative")
      setSessionId(sessionParam)
      loadSessionLocations(sessionParam)
    }
  }, [])

  useEffect(() => {
    if (mode !== "collaborative" || !sessionId) return

    const interval = setInterval(() => {
      loadSessionLocations(sessionId)
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [mode, sessionId])

  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const loadSessionLocations = (sid: string) => {
    const stored = localStorage.getItem(`tritry-${sid}`)
    if (stored) {
      const data: SessionData = JSON.parse(stored)
      setLocations(data.locations)
    }
  }

  const saveSessionLocations = (sid: string, locs: Location[]) => {
    const data: SessionData = {
      id: sid,
      locations: locs,
    }
    localStorage.setItem(`tritry-${sid}`, JSON.stringify(data))
  }

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return

    setMode(newMode)
    setLocations([])
    setSessionId(null)

    if (newMode === "collaborative") {
      const newSessionId = generateSessionId()
      setSessionId(newSessionId)
      saveSessionLocations(newSessionId, [])
      const url = `${window.location.origin}?session=${newSessionId}`
      window.history.pushState({}, "", url)
    } else {
      window.history.pushState({}, "", window.location.pathname)
    }
  }

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

    const updatedLocations = [...locations, newLocation]

    if (mode === "collaborative" && sessionId) {
      saveSessionLocations(sessionId, updatedLocations)
      setLocations(updatedLocations)
    } else {
      setLocations(updatedLocations)
    }
  }

  const handleReset = () => {
    if (mode === "collaborative" && sessionId) {
      saveSessionLocations(sessionId, [])
    }
    setLocations([])
  }

  const copyShareLink = () => {
    if (!sessionId) return
    const url = `${window.location.origin}?session=${sessionId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            {/* Mode Selector */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">모드 선택</h2>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={mode === "solo" ? "default" : "outline"}
                  onClick={() => handleModeChange("solo")}
                  className="justify-start gap-2"
                >
                  <User className="h-4 w-4" />
                  혼자 지정하기
                </Button>
                <Button
                  variant={mode === "collaborative" ? "default" : "outline"}
                  onClick={() => handleModeChange("collaborative")}
                  className="justify-start gap-2"
                >
                  <Users className="h-4 w-4" />
                  친구와 함께
                </Button>
              </div>
            </div>

            {mode === "collaborative" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  협업 모드는 같은 기기의 브라우저에서만 작동합니다. 링크를 공유해도 다른 기기에서는 위치가 공유되지
                  않습니다.
                </AlertDescription>
              </Alert>
            )}

            {/* Status Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {mode === "solo" ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">위치 지정 진행도</p>
                      <p className="text-2xl font-bold text-primary">{locations.length}/3</p>
                      <p className="text-xs text-muted-foreground">지도를 클릭하여 3개의 위치를 지정하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">공유 링크</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyShareLink}
                          disabled={!sessionId}
                          className="w-full gap-2 bg-transparent"
                        >
                          <Copy className="h-3 w-3" />
                          {copied ? "복사됨!" : "링크 복사"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">참여 현황</p>
                        <div className="space-y-1">
                          {[1, 2, 3].map((num) => {
                            const hasLocation = locations.some((loc) => loc.personNumber === num)
                            return (
                              <div key={num} className="flex items-center gap-2 text-sm">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    hasLocation ? "bg-primary" : "bg-muted-foreground/30"
                                  }`}
                                />
                                <span className={hasLocation ? "" : "text-muted-foreground"}>
                                  Person {num} {hasLocation ? "✓" : "(대기중)"}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

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
            <p className="font-semibold">Spot</p>
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
                <p className="text-muted-foreground">Spot 반지름</p>
                <p className="font-semibold">{radius.toFixed(2)} km</p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                세 지점에서 모두 같은 거리에 있는 최적의 만남 장소입니다.
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

  // Convert to radians
  const lat1 = (p1.lat * Math.PI) / 180
  const lon1 = (p1.lng * Math.PI) / 180
  const lat2 = (p2.lat * Math.PI) / 180
  const lon2 = (p2.lng * Math.PI) / 180
  const lat3 = (p3.lat * Math.PI) / 180
  const lon3 = (p3.lng * Math.PI) / 180

  // Convert to Cartesian coordinates
  const x1 = Math.cos(lat1) * Math.cos(lon1)
  const y1 = Math.cos(lat1) * Math.sin(lon1)
  const z1 = Math.sin(lat1)

  const x2 = Math.cos(lat2) * Math.cos(lon2)
  const y2 = Math.cos(lat2) * Math.sin(lon2)
  const z2 = Math.sin(lat2)

  const x3 = Math.cos(lat3) * Math.cos(lon3)
  const y3 = Math.cos(lat3) * Math.sin(lon3)
  const z3 = Math.sin(lat3)

  // Calculate average (centroid as approximation for small distances)
  const x = (x1 + x2 + x3) / 3
  const y = (y1 + y2 + y3) / 3
  const z = (z1 + z2 + z3) / 3

  // Convert back to lat/lng
  const lon = Math.atan2(y, x)
  const hyp = Math.sqrt(x * x + y * y)
  const lat = Math.atan2(z, hyp)

  const circumcenter = {
    lat: (lat * 180) / Math.PI,
    lng: (lon * 180) / Math.PI,
  }

  // Calculate radius using haversine formula
  const R = 6371 // Earth's radius in km
  const dLat = ((p1.lat - circumcenter.lat) * Math.PI) / 180
  const dLon = ((p1.lng - circumcenter.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((circumcenter.lat * Math.PI) / 180) *
      Math.cos((p1.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const radius = R * c

  return { circumcenter, radius }
}
