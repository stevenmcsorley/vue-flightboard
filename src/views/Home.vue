<template>
  <div>
    <!-- <article>
      <select v-model="direction">
        <option disabled value="">Please select one</option>
        <option value="arrival">Arrivals</option>
        <option value="departure">Departures</option>
      </select>
      <select v-model="arivalCode" v-if="direction === 'arrival'">
        <option disabled value="">Please select one</option>
        <option value="iataCode">iataCode</option>
        <option value="icaoCode">icaoCode</option>
      </select>
      <select v-model="departureCode" v-if="direction === 'departure'">
        <option disabled value="">Please select one</option>
        <option value="iataCode">iataCode</option>
        <option value="icaoCode">icaoCode</option>
      </select>
    </article>
    <article>
      <select v-model="statusSelect" v-on:change="findFlightStatus()">
        <option disabled value="">Status</option>
        <option value="started">started</option>
        <option value="en-route">en-route</option>
        <option value="landed">landed</option>
        <option value="unknown">unknown</option>
      </select>
    </article>
    <input
      type="text"
      v-model="searchQuery"
      v-if="arivalCode || departureCode"
    />
    <button v-on:click="findFlight()" v-if="arivalCode || departureCode">
      Search
    </button>-->
    <div
      class="dev-card-base dev-u-padding-default"
      style="background:#FFFF03;color:black;"
    >
      <div class="dev-grid-wrapper__article--row--3">
        <article>
          <h4 v-if="airport" style="color:black;font-size:24px;">
            {{ this.searchedCity.airport }}
          </h4>
        </article>
        <article>
          <input
            type="text"
            v-model="airport"
            placeholder="Search Flight Timetables ... GLA, JFK"
            v-on:keyup="onSearchChange"
          />
          <transition name="fade">
            <button
              v-on:click="getFlightTimeTables()"
              v-if="airport"
              class="dev-btn"
              style="background:black;"
            >
              Search
            </button>
          </transition>
        </article>
        <article>
          <h4 v-if="this.loading">LOADING FLIGHTS</h4>
          <h4 v-if="flightCount">{{ flightCount }} Flights</h4>
          <h4 v-if="this.isLoadedCities">LOADING CITIES</h4>
          <p v-if="this.allAirports">{{ this.allAirports.length }} Airports</p>
          <p>{{ theTime }}</p>
        </article>
      </div>
    </div>

    <vue-good-table
      :columns="columns"
      :rows="rows"
      :pagination-options="{
        enabled: true,
        mode: 'records',
        perPage: 16,
        position: 'bottom',
        perPageDropdown: [16, 24, 36],
        dropdownAllowAll: false,
        setCurrentPage: 1,
        nextLabel: 'next',
        prevLabel: 'prev',
        rowsPerPageLabel: 'Rows per page',
        ofLabel: 'of',
        pageLabel: 'page', // for 'pages' mode
        allLabel: 'All'
      }"
      styleClass="dev-simple-table--half-bordered dev-full-width"
    >
      <template slot="table-row" slot-scope="props">
        <span v-if="props.column.field === 'd'">{{
          findLocalCity(props.formattedRow[props.column.field])
        }}</span>
      </template>
    </vue-good-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import request from 'axios'

import { getModule } from 'vuex-module-decorators'
// import WeatherStore from "../store/weatherStore/WeatherStore";
import FlightStore from '../store/flights/flightStore'
import moment, { Moment } from 'moment'

import fetchFlightTimeTables from '../apiRepo/flightsApiRepo'
import mockAirports from '../jsonObjects/airports.json'
import mockAirportDB from '../jsonObjects/airportDatabase.json'
const api = fetchFlightTimeTables

@Component({
  components: {}
})
export default class Home extends Vue {
  FlightStore = getModule(FlightStore);
  private loading = false;
  private loadingCities = false;
  private wrk = '';
  private count = 0;
  private total = 0;
  private clearInt= 0;
  private flightDataSet = [];
  private direction = 'departure';
  private arivalCode = '';
  private departureCode = '';
  private searchQuery = '';
  private statusSelect = '';
  private flightTables = [];
  private airport = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private allcities: any = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private allAirports: any = [];
  private columns = [
    {
      label: 'Time',
      field: 'time',
      type: 'date',
      tdClass: 'whitCol',
      formatFn: function (
        value:
          | string
          | number
          | void
          | moment.Moment
          | Date
          | (string | number)[]
          | moment.MomentInputObject
          | null
          | undefined
      ) {
        return value != null
          ? moment(value, 'YYYY/MM/DD HH:mm:ss').format('H:MM')
          : null
      }
    },
    {
      label: 'Scheduled',
      field: 'scheduled',
      type: 'date',
      tdClass: 'whitCol',
      formatFn: function (
        value:
          | string
          | number
          | void
          | moment.Moment
          | Date
          | (string | number)[]
          | moment.MomentInputObject
          | null
          | undefined
      ) {
        return value != null
          ? moment(value, 'YYYY/MM/DD HH:mm:ss')
            .startOf('hour')
            .fromNow()
          : null
      }
    },
    {
      label: 'DESTIN',
      field: 'destination',
      tdClass: 'yellowCol'
    },
    {
      label: 'Airline',
      field: 'airline',
      tdClass: 'blueCol'
    },
    {
      label: 'Flight',
      field: 'flight',
      tdClass: 'whitCol'
    },
    {
      label: 'Delay',
      field: 'delay',
      tdClass: 'dev-warn'
    },
    {
      label: 'Gate',
      field: 'gate'
    },
    {
      label: 'Terminal',
      field: 'terminal'
    },
    {
      label: 'REMARKS',
      field: 'remarks'
    }
  ];

  private async created () {
    // await this.getFlightData();
    // await this.getFlightTimeTables();
    await this.fetchCities()
    // await this.findCity("AMS");
    await this.processAllAirports()
  }

  get flightCount () {
    return this.flightTables.length
  }

  get searchedCity () {
    return this.findLocalCity(this.airport.toUpperCase())
  }

  get theTime () {
    return moment()
  }

  private onSearchChange (event: any) {
    if (event.key === 'Enter') {
      this.getFlightTimeTables()
    }
  }

  private async getFlightData () {
    if (!this.FlightStore.getFlights.flightsData) {
      const apikey = 'a3021b-8a3f53'
      try {
        const flights =
          'https://aviation-edge.com/v2/public/flights?key=a3021b-8a3f53'
        const response = await request.get(flights)
        const res = response.data
        this.FlightStore.updateFlights({ flightsData: res })
        console.log('api', res)
        this.flightDataSet = res
      } catch (error) {
        throw new Error(error)
      }
    } else {
      console.log('stored', this.FlightStore.getFlights)
      this.flightDataSet = this.FlightStore.getFlights
    }
  }

  private async findFlight () {
    // console.log("search");
    const dir = this.direction
    const search = await this.searchQuery
    const journeySide = this.arivalCode ? this.arivalCode : this.departureCode
    const results = this.flightDataSet.flightsData
    // //console.log("side", check );
    // // let flightResults = check.filter(function(
    // //   flight: any
    // // ) {
    // //   return flight.journeySide == search;
    // // });
    // results.map(result=>{
    //   result.results = result.results.filter(r=>(search.includes(this.flightDataSet.flightsData.arrival.iataCode)))
    //   return result
    // })
    // const result = results.filter(p => p.arrival.some(s => s.iataCode === 'SFO'))
    const result = await results.filter(
      (ar: { [x: string]: { [x: string]: string } }) =>
        ar[`${dir}`][`${journeySide}`] === search
    )
    console.log(result)
    // console.log("search", results);
  }

  private async findFlightStatus () {
    console.log('fsfs')
    const results = this.flightDataSet.flightsData
    const flightsWithStat = await results.filter(
      (ar: { status: string }) => ar.status === this.statusSelect
    )
    console.log(flightsWithStat)
  }

  get rows () {
    return this.flightTables.map((flight: any) => {
      return {
        time: flight.departure.estimatedTime,
        scheduled: flight.departure.scheduledTime,
        destination: this.findLocalCity(`${flight.arrival.iataCode}`).city + ` (${flight.arrival.iataCode})`,
        airline: flight.airline.name,
        flight: flight.flight.iataNumber,
        delay: flight.departure.delay,
        gate: flight.departure.gate,
        terminal: flight.departure.terminal,
        remarks: flight.status
      }
    })
    // return this.flightTables;
  }

  //   const deviceList = await this.deviceApiService.getDeviceList(
  //   this.tokenString
  // );
  private async getFlightTimeTables () {
    clearInterval(this.clearInt)
    this.count = 0
    this.flightTables = []
    this.loading = true
    const flightTimeTables = await api.fetchFlightTimeTables(
      this.airport
    )
    this.flightTables = flightTimeTables
    this.loading = false
  }

  private async fetchCities () {
    // const cities =
    //   "https://aviation-edge.com/v2/public/airportDatabase?key=a3021b-8a3f53";
    // const response = await request.get(cities);
    // let res = response.data;
    const res = mockAirportDB
    // this.FlightStore.updateFlights({ flightsData: res });
    console.log('cities', res)
    this.allcities = res
    this.FlightStore.updateCities({ citiesData: res })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findCity (iatacode: any) {
    const city = this.FlightStore.getCities.citiesData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = city.find(function (element: any) {
      return element.codeIataAirport === iatacode
    })
    // console.log("city", found.nameCity);
    return found.nameAirport
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findCityFromAirport (iatacode: any) {
    const city = this.FlightStore.getCities.citiesData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = city.find(function (element: any) {
      return element.codeIataAirport === iatacode
    })
    return found.city
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findLocalCity (code: any) {
    const city = this.allAirports
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found: any | undefined = city.find(function (element: any) {
      return element.iata_code === code
    })
    // console.log("city", found.name);
    return {
      airport: found.name,
      city: found.municipality
    }
  }

  private simClickNext () {
    const nextBtn: HTMLElement = document.querySelectorAll(
      'div.footer__navigation.vgt-pull-right > a:nth-child(3)'
    )[0] as HTMLElement
    const prevBtn: HTMLElement = document.querySelectorAll(
      'div.footer__navigation.vgt-pull-right > a:nth-child(1)'
    )[0] as HTMLElement
    this.total = this.flightTables.length / 13
    if (this.count < this.total) {
      this.count++
      nextBtn.click()
      console.log('next', this.count)
    } else if (this.count > this.total && this.count < this.total * 2) {
      this.count++
      console.log('prev', this.count)
      if (this.count > this.total * 2 - 1) {
        this.count = 0
        console.log('prev ended')
      }
      prevBtn.click()
      console.log('prev', this.count)
    }
    console.log('clicked', this.count)
  }

  private async processAllAirports () {
    this.allAirports = await mockAirports
    console.log('fdss', this.allAirports)
    console.log('cols', this.columns)
  }

  get isLoadedCities () {
    return (this.loadingCities = !(this.allAirports.length > 0))
  }
}
</script>

<style scoped lang="scss">
body {
  background: #0f1110;
  color: #ecd60b;
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #ecd60b;
}
.wrapper {
  padding: 10px;
  max-width: 940px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  //grid-template-rows:repeat(3, 1fr);
  gap: 5px;
  //display: flex;
}
.card {
  // justify-content: flex-start;
  width: 100%;
}
.card div {
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
