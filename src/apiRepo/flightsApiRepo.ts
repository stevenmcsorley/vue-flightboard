import request from 'axios'

// eslint-disable-next-line @typescript-eslint/class-name-casing
export default {

  async fetchFlightTimeTables (airport: string) {
    const url =
          'http://aviation-edge.com/v2/public/timetable?key=a3021b-8a3f53&iataCode=' +
          airport +
          '&type=departure'
    const timetable = url
    const response = await request.get(timetable)
    const res = response.data

    console.log('api timetable', res)

    return res
  }
}
