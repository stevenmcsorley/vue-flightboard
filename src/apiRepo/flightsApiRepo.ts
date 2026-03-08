import request from 'axios'
import { FlightsTableDeparture } from '@/interfaces/IFlightTables'
import { normalizeAirportCode } from '@/utils/flightBoard'

const API_BASE_URL = 'http://aviation-edge.com/v2/public'

async function fetchFlightTimeTables (
  airport: string
): Promise<FlightsTableDeparture[]> {
  const airportCode = normalizeAirportCode(airport)
  const apiKey = process.env.VUE_APP_API_KEY

  if (!airportCode) {
    return []
  }

  if (!apiKey) {
    throw new Error('Missing VUE_APP_API_KEY')
  }

  const url = `${API_BASE_URL}/timetable?key=${apiKey}&iataCode=${airportCode}&type=departure`
  const response = await request.get<FlightsTableDeparture[]>(url)

  return Array.isArray(response.data) ? response.data : []
}

export default {
  fetchFlightTimeTables
}
