import moment from 'moment'
import { FlightsTableDeparture } from '@/interfaces/IFlightTables'
import {
  AirportDataRecord,
  AirportDatabaseRecord,
  buildAirportOptions,
  getAirportSuggestions,
  mapFlightsToRows,
  normalizeAirportCode,
  summarizeFlights
} from '@/utils/flightBoard'

function createAirportRecord (
  code: string,
  municipality: string,
  name: string
): AirportDataRecord {
  const record = {
    municipality,
    name
  } as AirportDataRecord

  Reflect.set(record, 'iata_code', code)

  return record
}

const airportRecords: AirportDataRecord[] = [
  createAirportRecord('GLA', 'Glasgow', 'Glasgow Airport'),
  createAirportRecord('JFK', 'New York', 'John F Kennedy International Airport')
]

const airportDatabase: AirportDatabaseRecord[] = [
  {
    codeIataAirport: 'GLA',
    nameAirport: 'Glasgow Airport',
    nameCountry: 'United Kingdom'
  },
  {
    codeIataAirport: 'JFK',
    nameAirport: 'John F Kennedy International Airport',
    nameCountry: 'United States'
  }
]

const sampleFlights: FlightsTableDeparture[] = [
  {
    airline: {
      iataCode: 'BA',
      icaoCode: 'BAW',
      name: 'British Airways'
    },
    arrival: {
      baggage: '',
      delay: '0',
      gate: 'B12',
      iataCode: 'JFK',
      icaoCode: 'KJFK',
      scheduledTime: new Date('2026-03-08T14:00:00Z'),
      terminal: '4'
    },
    codeshared: {
      airline: {
        iataCode: 'BA',
        icaoCode: 'BAW',
        name: 'British Airways'
      },
      flight: {
        iataNumber: 'BA1492',
        icaoNumber: 'BAW1492',
        number: '1492'
      }
    },
    departure: {
      delay: '18',
      estimatedTime: new Date('2026-03-08T10:42:00Z'),
      gate: '42',
      iataCode: 'GLA',
      icaoCode: 'EGPF',
      scheduledTime: new Date('2026-03-08T10:30:00Z'),
      terminal: 'M'
    },
    flight: {
      iataNumber: 'BA1492',
      icaoNumber: 'BAW1492',
      number: '1492'
    },
    status: 'boarding',
    type: 'departure'
  }
]

describe('flightBoard utilities', () => {
  const originalNow = moment.now

  afterEach(() => {
    moment.now = originalNow
  })

  it('normalizes airport codes for search input', () => {
    expect(normalizeAirportCode('  jfk-123 ')).toBe('JFK')
  })

  it('builds searchable airport options from both datasets', () => {
    const airports = buildAirportOptions(airportRecords, airportDatabase)
    expect(airports).toHaveLength(2)
    expect(airports[0]).toMatchObject({
      airport: 'Glasgow Airport',
      city: 'Glasgow',
      code: 'GLA',
      country: 'United Kingdom'
    })
  })

  it('prioritizes code matches in airport suggestions', () => {
    const airports = buildAirportOptions(airportRecords, airportDatabase)
    const suggestions = getAirportSuggestions(airports, 'GL')

    expect(suggestions[0].code).toBe('GLA')
  })

  it('maps flights into table rows with readable formatting', () => {
    moment.now = () => new Date('2026-03-08T10:00:00Z').valueOf()

    const airports = buildAirportOptions(airportRecords, airportDatabase)
    const rows = mapFlightsToRows(sampleFlights, airports)

    expect(rows[0]).toMatchObject({
      airline: 'British Airways',
      delay: '18 min',
      destination: 'New York (JFK)',
      flight: 'BA1492',
      gate: '42',
      remarks: 'Boarding',
      scheduled: 'in 30 minutes',
      terminal: 'M',
      time: '10:42'
    })
  })

  it('summarizes delay and gate coverage', () => {
    const summary = summarizeFlights(sampleFlights)

    expect(summary).toEqual({
      delayed: 1,
      gatesAssigned: 1,
      onTime: 0,
      total: 1
    })
  })
})
