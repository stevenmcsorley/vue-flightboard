import request from 'axios'

// eslint-disable-next-line @typescript-eslint/class-name-casing
export default {

  async fetchFlightTimeTables (airport: string) {
    const flightType = 'departure'
    const baseUrl = 'http://aviation-edge.com/v2/public/'
    const url = `${baseUrl}timetable?key=${process.env.VUE_APP_API_KEY}&iataCode=${airport}&type=departure`
    const timetable = url
    const response = await request.get(timetable)
    const res = response.data

    console.log('api timetable', res)

    return res
  }
}
