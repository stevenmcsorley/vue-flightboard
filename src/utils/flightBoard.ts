import moment, { MomentInput } from 'moment'
import { FlightsTableDeparture } from '@/interfaces/IFlightTables'

export interface AirportDataRecord {
  iata_code: string;
  municipality: string;
  name: string;
}

export interface AirportDatabaseRecord {
  codeIataAirport: string;
  nameAirport: string;
  nameCountry: string;
}

export interface AirportOption {
  airport: string;
  city: string;
  code: string;
  country: string;
  searchText: string;
}

export interface FlightBoardRow {
  airline: string;
  delay: string;
  destination: string;
  flight: string;
  gate: string;
  remarks: string;
  scheduled: string;
  terminal: string;
  time: string;
}

export interface FlightBoardSummary {
  delayed: number;
  gatesAssigned: number;
  onTime: number;
  total: number;
}

export function normalizeAirportCode (value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
}

function buildSearchText (
  airport: Pick<AirportOption, 'airport' | 'city' | 'code' | 'country'>
): string {
  return [
    airport.code,
    airport.airport,
    airport.city,
    airport.country
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
}

export function buildAirportOptions (
  airports: AirportDataRecord[],
  airportDatabase: AirportDatabaseRecord[]
): AirportOption[] {
  const airportMap = new Map<string, Omit<AirportOption, 'searchText'>>()

  airportDatabase.forEach((entry) => {
    const code = normalizeAirportCode(entry.codeIataAirport)

    if (!code) {
      return
    }

    airportMap.set(code, {
      airport: entry.nameAirport || code,
      city: '',
      code,
      country: entry.nameCountry || ''
    })
  })

  airports.forEach((entry) => {
    const code = normalizeAirportCode(entry.iata_code)

    if (!code) {
      return
    }

    const existing = airportMap.get(code)

    airportMap.set(code, {
      airport: entry.name || existing?.airport || code,
      city: entry.municipality || existing?.city || '',
      code,
      country: existing?.country || ''
    })
  })

  return Array.from(airportMap.values())
    .map((airport) => ({
      ...airport,
      searchText: buildSearchText(airport)
    }))
    .sort((left, right) => left.code.localeCompare(right.code))
}

export function findAirportByCode (
  airports: AirportOption[],
  code: string
): AirportOption | undefined {
  const normalizedCode = normalizeAirportCode(code)

  return airports.find((airport) => airport.code === normalizedCode)
}

function getSuggestionScore (airport: AirportOption, query: string): number {
  const upperQuery = query.toUpperCase()

  if (airport.code.startsWith(upperQuery)) {
    return 0
  }

  if (airport.airport.toUpperCase().startsWith(upperQuery)) {
    return 1
  }

  if (airport.city.toUpperCase().startsWith(upperQuery)) {
    return 2
  }

  return 3
}

export function getAirportSuggestions (
  airports: AirportOption[],
  query: string,
  limit = 6
): AirportOption[] {
  const normalizedQuery = query.trim().toUpperCase()

  if (!normalizedQuery) {
    return []
  }

  return airports
    .filter((airport) => airport.searchText.includes(normalizedQuery))
    .sort((left, right) => {
      const scoreDifference = getSuggestionScore(left, normalizedQuery) -
        getSuggestionScore(right, normalizedQuery)

      if (scoreDifference !== 0) {
        return scoreDifference
      }

      return left.code.localeCompare(right.code)
    })
    .slice(0, limit)
}

export function formatBoardTime (
  value: MomentInput | null | undefined
): string {
  if (!value) {
    return 'TBC'
  }

  const parsed = moment(value)

  return parsed.isValid() ? parsed.format('HH:mm') : 'TBC'
}

export function formatRelativeTime (
  value: MomentInput | null | undefined
): string {
  if (!value) {
    return 'Awaiting update'
  }

  const parsed = moment(value)

  return parsed.isValid() ? parsed.fromNow() : 'Awaiting update'
}

export function formatFlightDelay (
  value: number | string | null | undefined
): string {
  const minutes = Number(value)

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 'On time'
  }

  return `${minutes} min`
}

export function formatFlightStatus (status: string | null | undefined): string {
  const cleanedStatus = (status || '')
    .replace(/_/g, ' ')
    .trim()

  if (!cleanedStatus) {
    return 'Scheduled'
  }

  return cleanedStatus
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getDestinationLabel (
  code: string,
  airports: AirportOption[]
): string {
  const destination = findAirportByCode(airports, code)

  if (!destination) {
    return code || 'Unknown'
  }

  const destinationName = destination.city || destination.airport

  return `${destinationName} (${destination.code})`
}

export function mapFlightsToRows (
  flights: FlightsTableDeparture[],
  airports: AirportOption[]
): FlightBoardRow[] {
  return flights.map((flight) => ({
    airline: flight.airline?.name || 'Unknown airline',
    delay: formatFlightDelay(flight.departure?.delay),
    destination: getDestinationLabel(flight.arrival?.iataCode || '', airports),
    flight: flight.flight?.iataNumber || flight.flight?.number || 'TBC',
    gate: flight.departure?.gate || 'TBA',
    remarks: formatFlightStatus(flight.status),
    scheduled: formatRelativeTime(
      flight.departure?.scheduledTime || flight.departure?.estimatedTime
    ),
    terminal: flight.departure?.terminal || 'TBA',
    time: formatBoardTime(
      flight.departure?.estimatedTime || flight.departure?.scheduledTime
    )
  }))
}

export function summarizeFlights (
  flights: FlightsTableDeparture[]
): FlightBoardSummary {
  const delayed = flights.filter(
    (flight) => Number(flight.departure?.delay) > 0
  ).length

  const gatesAssigned = flights.filter(
    (flight) => Boolean(flight.departure?.gate)
  ).length

  return {
    delayed,
    gatesAssigned,
    onTime: Math.max(flights.length - delayed, 0),
    total: flights.length
  }
}
