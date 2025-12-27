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
