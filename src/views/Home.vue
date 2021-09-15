<template>
  <div>
    <div
      class="dev-card-base dev-u-padding-default"
      style="background:#FFFF03;color:black;"
    >
      <div class="dev-grid-wrapper__article--row--3">
        <article>
          <h4 style="color:black;font-size:24px;">
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

import { getModule } from 'vuex-module-decorators'
import FlightStore from '../store/flights/flightStore'
import { FlightsTableDeparture } from '../interfaces/IFlightTables'
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
  private flightTables: FlightsTableDeparture[] = [];
  private airport = '';
  private allcities: any = '';
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
    await this.fetchCities()
    await this.processAllAirports()
  }

  get flightCount () {
    return this.flightTables.length
  }

  get searchedCity () {
    if (this.airport) {
      return this.findLocalCity(this.airport.toUpperCase())
    } else {
      return {
        airport: '',
        city: ''
      }
    }
  }

  get theTime () {
    return moment()
  }

  private onSearchChange (event: any) {
    if (event.key !== 'Enter') {
      return false
    }

    if (event.key === 'Enter') {
      this.getFlightTimeTables()
    }
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
  }

  private async getFlightTimeTables () {
    clearInterval(this.clearInt)
    this.count = 0
    this.loading = true
    const flightTimeTables = await api.fetchFlightTimeTables(
      this.airport
    )
    this.flightTables = flightTimeTables
    console.log('this.flightTables', this.flightTables)
    this.loading = false
  }

  private async fetchCities () {
    const res = mockAirportDB
    this.allcities = res
    this.FlightStore.updateCities({ citiesData: res })
  }

  // private findCity (iatacode: any) {
  //   const city = this.FlightStore.getCities.citiesData
  //   const found = city.find(function (element: any) {
  //     return element.codeIataAirport === iatacode
  //   })
  //   return found.nameAirport
  // }

  // private findCityFromAirport (iatacode: any) {
  //   const city = this.FlightStore.getCities.citiesData
  //   const found = city.find(function (element: any) {
  //     return element.codeIataAirport === iatacode
  //   })
  //   return found.city
  // }

  private findLocalCity (code: any) {
    const city = this.allAirports
    const found: any | undefined = city.find((element: any) => {
      return element.iata_code === code
    })
    console.log('found', found)
    if (found !== undefined) {
      return {
        airport: found.name,
        city: found.municipality
      }
    } else {
      return {
        airport: '',
        city: ''
      }
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
