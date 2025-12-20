"use client"

import { useEffect, useRef, useState } from "react"
import type { Location } from "@/app/page"

export default function MapComponent({
  locations,
  onMapClick,
}: {
  locations: Location[]
  onMapClick: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const markersRef = useRef<any[]>([])
  const circleRef = useRef<any>(null)
  const centerMarkerRef = useRef<any>(null)
  const triangleRef = useRef<any>(null)
  const radialLinesRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    // Dynamically import Leaflet
    import("leaflet").then((L) => {
      // Fix for default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      // Initialize map
      const map = L.map(mapRef.current!).setView([37.5665, 126.978], 11)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      setMapInstance(map)

      return () => {
        map.remove()
      }
    })
  }, [])

  useEffect(() => {
    if (!mapInstance) return

    // Remove previous click handler
    mapInstance.off("click")

    // Add new click handler with current locations state
    const handleClick = (e: any) => {
      if (locations.length < 3) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    }

    mapInstance.on("click", handleClick)

    return () => {
      mapInstance.off("click", handleClick)
    }
  }, [mapInstance, locations, onMapClick])

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstance || typeof window === "undefined") return

    import("leaflet").then((L) => {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      if (circleRef.current) {
        circleRef.current.remove()
        circleRef.current = null
      }
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove()
        centerMarkerRef.current = null
      }
      if (triangleRef.current) {
        triangleRef.current.remove()
        triangleRef.current = null
      }
      radialLinesRef.current.forEach((line) => line.remove())
      radialLinesRef.current = []

      // Define custom icons
      const colors = ["red", "blue", "green"]
      const icons = colors.map(
        (color) =>
          new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
      )

      // Add markers for each location
      locations.forEach((loc) => {
        const marker = L.marker([loc.lat, loc.lng], {
          icon: icons[loc.personNumber - 1],
        })
          .addTo(mapInstance)
          .bindPopup(`Person ${loc.personNumber}`)
        markersRef.current.push(marker)
      })

      // If all 3 locations are set, calculate and show circumcenter
      if (locations.length === 3) {
        const result = calculateCircumcenter(locations)

        const triangleCoords = [
          [locations[0].lat, locations[0].lng],
          [locations[1].lat, locations[1].lng],
          [locations[2].lat, locations[2].lng],
          [locations[0].lat, locations[0].lng], // Close the triangle
        ]
        triangleRef.current = L.polyline(triangleCoords as any, {
          color: "#6366f1",
          weight: 2,
          opacity: 0.8,
        }).addTo(mapInstance)

        // Create star icon for circumcenter
        const starIcon = L.divIcon({
          html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FFD700" stroke="#FF8C00" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
          className: "star-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        centerMarkerRef.current = L.marker([result.circumcenter.lat, result.circumcenter.lng], { icon: starIcon })
          .addTo(mapInstance)
          .bindPopup("Spot (외심)")

        locations.forEach((loc) => {
          const radialLine = L.polyline(
            [
              [loc.lat, loc.lng],
              [result.circumcenter.lat, result.circumcenter.lng],
            ] as any,
            {
              color: "#FFD700",
              weight: 1.5,
              opacity: 0.6,
              dashArray: "5, 5",
            },
          ).addTo(mapInstance)
          radialLinesRef.current.push(radialLine)
        })

        // Draw circle
        circleRef.current = L.circle([result.circumcenter.lat, result.circumcenter.lng], {
          radius: result.radius * 1000, // Convert km to meters
          color: "#FFD700",
          fillColor: "#FFD700",
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(mapInstance)

        // Fit bounds to show all markers and circle
        const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]))
        bounds.extend([result.circumcenter.lat, result.circumcenter.lng])
        mapInstance.fitBounds(bounds, { padding: [50, 50] })
      } else if (locations.length > 0) {
        // Fit to existing markers
        const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]))
        mapInstance.fitBounds(bounds, { padding: [50, 50] })
      }
    })
  }, [locations, mapInstance])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />
    </>
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

  // Calculate average (centroid as approximation)
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

  // Calculate radius
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
