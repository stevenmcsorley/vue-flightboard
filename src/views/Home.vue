<template>
  <main
    class="board-shell"
    :class="{ 'board-shell--gateway': isGatewayMode }"
  >
    <section class="masthead">
      <div class="masthead__intro">
        <p class="eyebrow">Live Departures</p>

        <div class="airport-lockup">
          <div class="airport-code-panel">
            <span class="airport-code-panel__label">IATA</span>
            <strong>{{ boardCode }}</strong>
          </div>

          <div class="airport-copy">
            <h1>{{ boardTitle }}</h1>
            <p class="hero-subtitle">{{ boardLocation }}</p>

            <div class="meta-strip">
              <span>{{ clockLabel }}</span>
              <span>{{ lastUpdatedText }}</span>
            </div>

            <p class="status-copy">{{ boardStatus }}</p>
          </div>
        </div>

        <div class="signal-strip">
          <article
            v-for="signal in heroSignals"
            :key="signal.label"
            class="signal-card"
          >
            <span>{{ signal.label }}</span>
            <strong>{{ signal.value }}</strong>
          </article>
        </div>
      </div>

      <aside class="control-panel">
        <div class="control-panel__head">
          <p class="eyebrow">Search Board</p>
          <h2>Load airport</h2>
        </div>

        <label class="search-label" for="airport-code">Airport code</label>

        <div class="search-shell">
          <input
            id="airport-code"
            v-model="airportQuery"
            type="text"
            maxlength="3"
            autocomplete="off"
            placeholder="Try GLA or JFK"
            @input="onSearchInput"
            @keyup.enter="loadFlights(false)"
          >

          <button
            class="board-button board-button--primary"
            :disabled="!canSearch || loading"
            @click="loadFlights(false)"
          >
            {{ searchButtonLabel }}
          </button>
        </div>

        <p class="search-hint">
          Search by a three-letter IATA airport code. The board refreshes with live departures.
        </p>

        <div class="chip-row">
          <button
            v-for="airport in featuredAirports"
            :key="airport.code"
            class="chip-button"
            @click="selectAirport(airport.code)"
          >
            <strong>{{ airport.code }}</strong>
            <span>{{ airport.city || airport.airport }}</span>
          </button>
        </div>

        <transition name="banner-fade">
          <p v-if="errorMessage" class="banner banner--error">
            {{ errorMessage }}
          </p>
        </transition>

        <ul v-if="suggestedAirports.length" class="suggestions">
          <li v-for="airport in suggestedAirports" :key="airport.code">
            <button
              class="suggestion-button"
              @click="selectAirport(airport.code)"
            >
              <span class="suggestion-code">{{ airport.code }}</span>

              <span class="suggestion-copy">
                <strong>{{ airport.airport }}</strong>
                <small>{{ airport.city || airport.country || 'Airport lookup' }}</small>
              </span>
            </button>
          </li>
        </ul>
      </aside>
    </section>

    <section class="metric-grid">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="metric-card"
      >
        <p>{{ metric.label }}</p>
        <strong>{{ metric.value }}</strong>
      </article>
    </section>

    <section class="board-panel">
      <div class="board-panel__header">
        <div class="board-panel__heading">
          <p class="eyebrow">Departures Board</p>
          <h2>{{ boardPanelTitle }}</h2>
          <p class="board-panel__subtext">{{ boardPanelText }}</p>
        </div>

        <div class="board-panel__actions">
          <div class="board-meta-ribbon">
            <span>{{ pageStatus }}</span>
            <span>{{ loopStatus }}</span>
            <span>{{ refreshStatus }}</span>
          </div>

          <div class="board-legend">
            <span class="board-legend__pill board-legend__pill--good">On time</span>
            <span class="board-legend__pill board-legend__pill--warn">Delayed</span>
            <span class="board-legend__pill board-legend__pill--alert">Cancelled</span>
          </div>

          <div class="board-panel__buttons">
            <button
              class="board-button board-button--ghost"
              @click="toggleGatewayMode"
            >
              {{ gatewayToggleLabel }}
            </button>

            <button
              v-if="activeAirportCode"
              class="board-button board-button--ghost"
              :disabled="loading"
              @click="refreshBoard"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div v-if="rows.length" class="table-shell">
        <table class="departure-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Scheduled</th>
              <th>Destination</th>
              <th>Airline</th>
              <th>Flight</th>
              <th>Delay</th>
              <th>Gate</th>
              <th>Terminal</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody :key="pageRenderKey" class="departure-table__body">
            <tr
              v-for="(row, rowIndex) in visibleRows"
              :key="rowKey(row, rowIndex)"
              class="board-row"
              :style="rowAnimationStyle(rowIndex)"
            >
              <td class="departure-table__cell departure-table__cell--time">
                {{ row.time }}
              </td>
              <td class="departure-table__cell departure-table__cell--scheduled">
                {{ row.scheduled }}
              </td>
              <td class="departure-table__cell departure-table__cell--destination">
                {{ row.destination }}
              </td>
              <td class="departure-table__cell departure-table__cell--airline">
                {{ row.airline }}
              </td>
              <td class="departure-table__cell departure-table__cell--flight">
                {{ row.flight }}
              </td>
              <td class="departure-table__cell departure-table__cell--delay">
                <span :class="delayClass(row.delay)">
                  {{ row.delay }}
                </span>
              </td>
              <td class="departure-table__cell departure-table__cell--gate">
                {{ row.gate }}
              </td>
              <td class="departure-table__cell departure-table__cell--terminal">
                {{ row.terminal }}
              </td>
              <td class="departure-table__cell departure-table__cell--status">
                <span :class="statusClass(row.remarks)">
                  {{ row.remarks }}
                </span>
              </td>
            </tr>

            <tr
              v-for="placeholderIndex in fillerRowCount"
              :key="`placeholder-${pageRenderKey}-${placeholderIndex}`"
              class="board-row board-row--placeholder"
            >
              <td class="departure-table__cell departure-table__cell--time">--:--</td>
              <td class="departure-table__cell departure-table__cell--scheduled">Awaiting update</td>
              <td class="departure-table__cell departure-table__cell--destination">Standby</td>
              <td class="departure-table__cell departure-table__cell--airline">-</td>
              <td class="departure-table__cell departure-table__cell--flight">-</td>
              <td class="departure-table__cell departure-table__cell--delay">-</td>
              <td class="departure-table__cell departure-table__cell--gate">-</td>
              <td class="departure-table__cell departure-table__cell--terminal">-</td>
              <td class="departure-table__cell departure-table__cell--status">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <h3>{{ emptyStateTitle }}</h3>
        <p>{{ emptyStateCopy }}</p>
      </div>
    </section>
  </main>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import moment from 'moment'
import fetchFlightTimeTables from '@/apiRepo/flightsApiRepo'
import { FlightsTableDeparture } from '@/interfaces/IFlightTables'
import airportDatabase from '@/jsonObjects/airportDatabase.json'
import airportRecords from '@/jsonObjects/airports.json'
import {
  AirportDataRecord,
  AirportDatabaseRecord,
  AirportOption,
  FlightBoardRow,
  buildAirportOptions,
  findAirportByCode,
  formatRelativeTime,
  getAirportSuggestions,
  mapFlightsToRows,
  normalizeAirportCode,
  summarizeFlights
} from '@/utils/flightBoard'

const FEATURED_CODES = ['GLA', 'LHR', 'JFK', 'HND']
const DEFAULT_AIRPORT_CODE = FEATURED_CODES[0]
const AUTO_ROTATE_INTERVAL_MS = 5200
const AUTO_REFRESH_INTERVAL_MS = 60000

interface MetricCard {
  label: string;
  value: string;
}

@Component
export default class Home extends Vue {
  private activeAirportCode = ''
  private airportOptions: AirportOption[] = []
  private airportQuery = ''
  private clockTimer: number | null = null
  private currentPageIndex = 0
  private errorMessage = ''
  private flightTables: FlightsTableDeparture[] = []
  private isGatewayMode = false
  private lastUpdatedAt: Date | null = null
  private loading = false
  private now = new Date()
  private pageRenderKey = 0
  private pageRotationTimer: number | null = null
  private refreshTimer: number | null = null
  private viewportHeight = 0
  private viewportWidth = 0

  private created (): void {
    this.airportOptions = buildAirportOptions(
      airportRecords as AirportDataRecord[],
      airportDatabase as AirportDatabaseRecord[]
    )
  }

  private async mounted (): Promise<void> {
    this.viewportHeight = window.innerHeight
    this.viewportWidth = window.innerWidth

    window.addEventListener('resize', this.handleResize)
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)

    this.clockTimer = window.setInterval(() => {
      this.now = new Date()
    }, 30000)

    if (!this.activeAirportCode) {
      this.airportQuery = DEFAULT_AIRPORT_CODE
      await this.loadFlights(false)
    }
  }

  private beforeDestroy (): void {
    if (this.clockTimer !== null) {
      window.clearInterval(this.clockTimer)
    }

    if (this.pageRotationTimer !== null) {
      window.clearInterval(this.pageRotationTimer)
    }

    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer)
    }

    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
  }

  get boardCode (): string {
    return this.selectedAirport?.code || '---'
  }

  get boardLocation (): string {
    const airport = this.selectedAirport

    if (!airport) {
      return 'Search any airport by IATA code to load the live departures board.'
    }

    const locationBits = [airport.city, airport.country].filter(Boolean)

    return [airport.code, locationBits.join(', ')].filter(Boolean).join(' · ')
  }

  get boardPanelText (): string {
    if (!this.activeAirportCode) {
      return 'Choose an airport to open the live departures board.'
    }

    return `Auto-rotating outbound services and latest status updates for ${this.activeAirportCode}.`
  }

  get boardPanelTitle (): string {
    if (!this.activeAirportCode) {
      return 'Departure board'
    }

    return `${this.activeAirportCode} departures`
  }

  get boardStatus (): string {
    if (this.loading) {
      return 'Pulling the latest scheduled departures from the live feed.'
    }

    if (!this.activeAirportCode) {
      return 'Start with a featured airport or type a code above to inspect the board.'
    }

    if (!this.rows.length) {
      return `No departures were returned for ${this.activeAirportCode} in the latest refresh.`
    }

    if (this.hasMultiplePages) {
      return `Showing ${this.rows.length} live departures from ${this.activeAirportCode}, rotating automatically through every page.`
    }

    return `Showing ${this.rows.length} live departures from ${this.activeAirportCode}.`
  }

  get boardTitle (): string {
    return this.selectedAirport?.airport || 'Flight Board'
  }

  get canSearch (): boolean {
    return this.normalizedAirportCode.length === 3
  }

  get clockLabel (): string {
    return moment(this.now).format('ddd D MMM YYYY • HH:mm')
  }

  get emptyStateCopy (): string {
    if (!this.activeAirportCode) {
      return 'Search for a three-letter airport code to display the current departures board.'
    }

    return 'Try refreshing the board or searching a different airport if you expected live departures here.'
  }

  get emptyStateTitle (): string {
    if (!this.activeAirportCode) {
      return 'No board selected yet'
    }

    return 'No departures available'
  }

  get featuredAirports (): AirportOption[] {
    return FEATURED_CODES
      .map((code) => findAirportByCode(this.airportOptions, code))
      .filter((airport): airport is AirportOption => airport !== undefined)
  }

  get fillerRowCount (): number {
    return Math.max(this.pageSize - this.visibleRows.length, 0)
  }

  get gatewayToggleLabel (): string {
    return this.isGatewayMode ? 'Exit gateway mode' : 'Gateway mode'
  }

  get hasMultiplePages (): boolean {
    return this.rows.length > this.pageSize
  }

  get heroSignals (): MetricCard[] {
    const summary = summarizeFlights(this.flightTables)

    return [
      {
        label: 'Feed',
        value: this.loading ? 'Refreshing' : this.activeAirportCode ? 'Live' : 'Idle'
      },
      {
        label: 'Flights',
        value: this.activeAirportCode ? `${summary.total}` : '--'
      },
      {
        label: 'Pages',
        value: this.activeAirportCode ? `${this.pageCount}` : '--'
      }
    ]
  }

  get lastUpdatedText (): string {
    if (!this.lastUpdatedAt) {
      return 'Waiting for first refresh'
    }

    return `Updated ${formatRelativeTime(this.lastUpdatedAt)}`
  }

  get loopStatus (): string {
    if (!this.rows.length) {
      return 'Loop ready'
    }

    if (!this.hasMultiplePages) {
      return 'Single page board'
    }

    return `Auto loop every ${Math.round(this.pageRotationInterval / 1000)}s`
  }

  get metrics (): MetricCard[] {
    const summary = summarizeFlights(this.flightTables)

    return [
      {
        label: 'Delayed',
        value: this.activeAirportCode ? `${summary.delayed}` : '--'
      },
      {
        label: 'On time',
        value: this.activeAirportCode ? `${summary.onTime}` : '--'
      },
      {
        label: 'Ready gates',
        value: this.activeAirportCode ? `${summary.gatesAssigned}` : '--'
      },
      {
        label: 'Airports indexed',
        value: `${this.airportOptions.length}`
      }
    ]
  }

  get normalizedAirportCode (): string {
    return normalizeAirportCode(this.airportQuery)
  }

  get pageCount (): number {
    return this.getPageCount(this.rows.length)
  }

  get pageRotationInterval (): number {
    return this.isGatewayMode ? AUTO_ROTATE_INTERVAL_MS - 1400 : AUTO_ROTATE_INTERVAL_MS
  }

  get pageSize (): number {
    if (this.isGatewayMode) {
      if (this.viewportHeight >= 1200) {
        return 18
      }

      if (this.viewportHeight >= 1000) {
        return 15
      }

      if (this.viewportWidth >= 1200) {
        return 13
      }

      return 10
    }

    if (this.viewportWidth >= 1440) {
      return 14
    }

    if (this.viewportWidth >= 1100) {
      return 12
    }

    return 9
  }

  get pageStatus (): string {
    if (!this.rows.length) {
      return 'Awaiting flights'
    }

    if (!this.hasMultiplePages) {
      return `${this.rows.length} flights on one board`
    }

    return `Board ${this.currentPageIndex + 1} of ${this.pageCount}`
  }

  get refreshStatus (): string {
    if (!this.activeAirportCode) {
      return 'Auto refresh ready'
    }

    return `Refresh every ${Math.round(AUTO_REFRESH_INTERVAL_MS / 1000)}s`
  }

  get rows (): FlightBoardRow[] {
    return mapFlightsToRows(this.flightTables, this.airportOptions)
  }

  get searchButtonLabel (): string {
    if (this.loading) {
      return 'Loading...'
    }

    if (this.activeAirportCode === this.normalizedAirportCode) {
      return 'Refresh board'
    }

    return 'Search flights'
  }

  get selectedAirport (): AirportOption | undefined {
    return findAirportByCode(
      this.airportOptions,
      this.activeAirportCode || this.normalizedAirportCode
    )
  }

  get suggestedAirports (): AirportOption[] {
    if (
      !this.airportQuery ||
      (this.airportQuery === this.activeAirportCode && this.rows.length > 0)
    ) {
      return []
    }

    return getAirportSuggestions(this.airportOptions, this.airportQuery)
  }

  get visibleRows (): FlightBoardRow[] {
    const start = this.currentPageIndex * this.pageSize

    return this.rows.slice(start, start + this.pageSize)
  }

  private readonly handleFullscreenChange = (): void => {
    if (!document.fullscreenElement && this.isGatewayMode) {
      this.isGatewayMode = false
      this.syncPageIndex(this.rows.length)
      this.bumpBoardMotion()
      this.restartBoardTimers()
    }
  }

  private readonly handleResize = (): void => {
    this.viewportHeight = window.innerHeight
    this.viewportWidth = window.innerWidth
    this.syncPageIndex(this.rows.length)
    this.restartPageRotation()
  }

  private async toggleGatewayMode (): Promise<void> {
    this.isGatewayMode = !this.isGatewayMode
    this.syncPageIndex(this.rows.length)
    this.bumpBoardMotion()
    this.restartPageRotation()

    const host = this.$el as HTMLElement

    if (this.isGatewayMode && host.requestFullscreen) {
      try {
        await host.requestFullscreen()
      } catch (error) {
        // CSS-only gateway mode is still useful if fullscreen is blocked.
      }
    }

    if (!this.isGatewayMode && document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen()
      } catch (error) {
        // Ignore exit failures and keep the CSS mode in sync.
      }
    }
  }

  private delayClass (delay: string): string {
    if (delay === 'On time') {
      return 'delay-pill delay-pill--good'
    }

    return 'delay-pill delay-pill--warn'
  }

  private statusClass (status: string): string {
    const normalizedStatus = status.toLowerCase()

    if (normalizedStatus.includes('cancel')) {
      return 'status-chip status-chip--alert'
    }

    if (normalizedStatus.includes('delay') || normalizedStatus.includes('active')) {
      return 'status-chip status-chip--warn'
    }

    return 'status-chip status-chip--ok'
  }

  private rowAnimationStyle (rowIndex: number): Record<string, string> {
    return {
      '--row-delay': `${rowIndex * (this.isGatewayMode ? 42 : 28)}ms`
    }
  }

  private rowKey (row: FlightBoardRow, rowIndex: number): string {
    return `${this.pageRenderKey}-${row.flight}-${row.time}-${rowIndex}`
  }

  private onSearchInput (): void {
    this.airportQuery = normalizeAirportCode(this.airportQuery)
    this.errorMessage = ''
  }

  private async loadFlights (preservePageIndex: boolean): Promise<void> {
    if (!this.canSearch) {
      this.errorMessage = 'Enter a valid three-letter IATA airport code.'
      return
    }

    const airportCode = this.normalizedAirportCode

    this.loading = true
    this.errorMessage = ''

    try {
      const flights = await fetchFlightTimeTables.fetchFlightTimeTables(airportCode)
      const nextPageCount = this.getPageCount(flights.length)

      this.activeAirportCode = airportCode
      this.flightTables = flights
      this.lastUpdatedAt = new Date()

      if (preservePageIndex) {
        this.currentPageIndex = Math.min(this.currentPageIndex, nextPageCount - 1)
      } else {
        this.currentPageIndex = 0
      }

      this.bumpBoardMotion()
      this.restartBoardTimers()
    } catch (error) {
      this.errorMessage = `Live departures for ${airportCode} could not be loaded. Check VUE_APP_API_KEY or try again later.`
    } finally {
      this.loading = false
    }
  }

  private advanceBoardPage (): void {
    if (!this.hasMultiplePages) {
      return
    }

    this.currentPageIndex = (this.currentPageIndex + 1) % this.pageCount
    this.bumpBoardMotion()
  }

  private async refreshBoard (): Promise<void> {
    this.airportQuery = this.activeAirportCode
    await this.loadFlights(true)
  }

  private async selectAirport (code: string): Promise<void> {
    this.airportQuery = normalizeAirportCode(code)
    await this.loadFlights(false)
  }

  private restartBoardTimers (): void {
    this.restartPageRotation()
    this.restartRefreshTimer()
  }

  private restartPageRotation (): void {
    if (this.pageRotationTimer !== null) {
      window.clearInterval(this.pageRotationTimer)
    }

    if (!this.hasMultiplePages) {
      this.pageRotationTimer = null
      return
    }

    this.pageRotationTimer = window.setInterval(() => {
      this.advanceBoardPage()
    }, this.pageRotationInterval)
  }

  private restartRefreshTimer (): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer)
    }

    if (!this.activeAirportCode) {
      this.refreshTimer = null
      return
    }

    this.refreshTimer = window.setInterval(() => {
      if (!this.loading) {
        this.refreshBoard()
      }
    }, AUTO_REFRESH_INTERVAL_MS)
  }

  private bumpBoardMotion (): void {
    this.pageRenderKey += 1
  }

  private syncPageIndex (totalRows: number): void {
    const nextPageCount = this.getPageCount(totalRows)
    this.currentPageIndex = Math.min(this.currentPageIndex, nextPageCount - 1)
  }

  private getPageCount (totalRows: number): number {
    if (totalRows <= 0) {
      return 1
    }

    return Math.max(Math.ceil(totalRows / this.pageSize), 1)
  }
}
</script>

<style lang="scss">
.board-shell {
  --board-amber: #ffd86b;
  --board-amber-bright: #fff3b5;
  --board-amber-soft: rgba(255, 216, 107, 0.18);
  --board-panel: rgba(10, 13, 18, 0.78);
  --board-panel-border: rgba(255, 216, 107, 0.16);
  --board-sky: #edf3ff;
  --board-slate: #9aaac0;
  --board-grid: rgba(255, 255, 255, 0.045);
  position: relative;
  min-height: 100vh;
  padding: 28px clamp(18px, 4vw, 48px) 42px;
  color: var(--board-sky);
  background:
    radial-gradient(circle at top left, rgba(255, 216, 107, 0.22), transparent 24%),
    radial-gradient(circle at bottom right, rgba(99, 127, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #0d1117 0%, #090c11 100%);
  isolation: isolate;
  animation: board-enter 420ms ease-out both;
}

.board-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(var(--board-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--board-grid) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.65), transparent 100%);
  pointer-events: none;
  z-index: -1;
}

.masthead {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 420px);
  align-items: stretch;
}

.masthead__intro,
.control-panel,
.board-panel,
.metric-card,
.signal-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--board-panel-border);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    var(--board-panel);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 30px 90px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
}

.masthead__intro,
.control-panel,
.board-panel {
  padding: 28px;
}

.masthead__intro::after,
.control-panel::after,
.metric-card::after {
  content: '';
  position: absolute;
  inset: auto -48px -48px auto;
  width: 160px;
  height: 160px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 216, 107, 0.16), transparent 72%);
  pointer-events: none;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--board-amber);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.airport-lockup {
  display: grid;
  gap: 28px;
  grid-template-columns: minmax(140px, 156px) minmax(0, 1fr);
  align-items: start;
}

.airport-code-panel {
  display: grid;
  gap: 10px;
  align-content: start;
  min-height: 176px;
  padding: 18px;
  border: 1px solid rgba(255, 216, 107, 0.18);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 216, 107, 0.12), rgba(255, 216, 107, 0.02)),
    rgba(0, 0, 0, 0.24);
}

.airport-code-panel__label {
  color: var(--board-slate);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.airport-code-panel strong {
  display: block;
  color: var(--board-amber-bright);
  font-family: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', monospace;
  font-size: clamp(2.4rem, 4.6vw, 4.1rem);
  line-height: 0.92;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.airport-copy {
  display: grid;
  gap: 0;
  min-width: 0;
  padding-top: 4px;
}

.airport-copy h1,
.control-panel h2,
.board-panel h2,
.empty-state h3 {
  margin: 0;
  color: #fffdf4;
  font-family: 'Avenir Next Condensed', 'Avenir Next', 'Segoe UI', sans-serif;
}

.airport-copy h1 {
  max-width: 9ch;
  font-size: clamp(2.6rem, 5.1vw, 4.6rem);
  line-height: 0.92;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.hero-subtitle,
.status-copy,
.search-hint,
.board-panel__subtext,
.empty-state p {
  margin: 0;
  color: var(--board-slate);
  font-size: 1rem;
  line-height: 1.6;
}

.hero-subtitle {
  margin-top: 12px;
  max-width: 48ch;
}

.meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px 0 14px;
}

.meta-strip span,
.board-meta-ribbon span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #dce6f7;
  font-size: 0.9rem;
}

.signal-strip {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 26px;
}

.signal-card {
  padding: 18px 18px 16px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 216, 107, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(0, 0, 0, 0.3);
}

.signal-card span,
.metric-card p {
  display: block;
  margin: 0 0 10px;
  color: var(--board-slate);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.signal-card strong,
.metric-card strong {
  display: block;
  color: #fffdf4;
  font-family: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', monospace;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1;
}

.control-panel {
  display: flex;
  flex-direction: column;
}

.control-panel__head {
  margin-bottom: 12px;
}

.control-panel h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.search-label {
  display: block;
  margin-bottom: 10px;
  color: #fffdf4;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.search-shell {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.search-shell input {
  width: 100%;
  min-height: 60px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: #fffdf4;
  font-family: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', monospace;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.search-shell input:focus {
  outline: none;
  border-color: var(--board-amber);
  box-shadow: 0 0 0 3px var(--board-amber-soft);
}

.search-shell input::placeholder {
  color: rgba(232, 241, 255, 0.4);
}

.search-hint {
  margin-top: 12px;
}

.board-button {
  min-height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 18px;
  font-family: 'Avenir Next', 'Segoe UI', sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
  cursor: pointer;
}

.board-button:hover:not(:disabled),
.chip-button:hover,
.suggestion-button:hover {
  transform: translateY(-1px);
}

.board-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.board-button--primary {
  color: #14110a;
  background: linear-gradient(135deg, #ffe082 0%, #ffc653 100%);
  box-shadow: 0 16px 32px rgba(255, 198, 83, 0.18);
}

.board-button--ghost {
  color: #fffdf4;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.chip-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(255, 216, 107, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  color: #fffdf4;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  cursor: pointer;
}

.chip-button strong,
.suggestion-code {
  color: var(--board-amber);
  font-family: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', monospace;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
}

.chip-button span {
  color: #d7e1f4;
}

.suggestions {
  display: grid;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.suggestion-button {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  color: #fffdf4;
  text-align: left;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  cursor: pointer;
}

.suggestion-copy {
  display: grid;
  gap: 2px;
}

.suggestion-copy small {
  color: var(--board-slate);
}

.banner {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.94rem;
  line-height: 1.5;
}

.banner--error {
  border: 1px solid rgba(255, 132, 132, 0.28);
  background: rgba(130, 24, 24, 0.26);
  color: #ffd6d6;
}

.metric-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 20px 0;
}

.metric-card {
  padding: 20px 22px;
}

.board-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.board-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.board-panel__heading {
  max-width: 46ch;
}

.board-panel h2 {
  font-size: clamp(1.7rem, 3vw, 2.5rem);
}

.board-panel__subtext {
  margin-top: 10px;
}

.board-panel__actions {
  display: grid;
  gap: 12px;
  justify-items: end;
}

.board-meta-ribbon,
.board-legend,
.board-panel__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.board-legend__pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.board-legend__pill--good {
  background: rgba(103, 226, 161, 0.12);
  color: #98f1c0;
}

.board-legend__pill--warn {
  background: rgba(255, 216, 107, 0.14);
  color: #ffe59a;
}

.board-legend__pill--alert {
  background: rgba(255, 132, 132, 0.14);
  color: #ffc2c2;
}

.table-shell {
  flex: 1;
  overflow: auto hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 216, 107, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.01)),
    rgba(0, 0, 0, 0.2);
}

.departure-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.departure-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 216, 107, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 216, 107, 0.06), rgba(255, 255, 255, 0.01)),
    rgba(4, 8, 13, 0.96);
  color: var(--board-slate);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.departure-table__body {
  position: relative;
}

.board-row td {
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255, 216, 107, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0.01)),
    rgba(0, 0, 0, 0.16);
  animation: split-flap-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--row-delay, 0ms);
  transform-origin: 50% 0%;
}

.board-row:nth-child(odd) td {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.024), rgba(255, 255, 255, 0.012)),
    rgba(0, 0, 0, 0.16);
}

.board-row:hover td {
  background:
    linear-gradient(180deg, rgba(255, 216, 107, 0.06), rgba(255, 255, 255, 0.012)),
    rgba(0, 0, 0, 0.18);
}

.board-row--placeholder td {
  color: rgba(154, 170, 192, 0.34);
}

.departure-table__cell {
  color: #f0f5ff;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.departure-table__cell--time,
.departure-table__cell--flight,
.departure-table__cell--gate,
.departure-table__cell--terminal {
  font-family: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.departure-table__cell--time,
.departure-table__cell--destination,
.departure-table__cell--flight {
  color: var(--board-amber-bright);
}

.departure-table__cell--airline {
  color: #7fc0ff;
}

.departure-table__cell--gate,
.departure-table__cell--terminal {
  color: #bde2a4;
}

.delay-pill,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.delay-pill--good,
.status-chip--ok {
  background: rgba(103, 226, 161, 0.12);
  color: #91f0bb;
}

.delay-pill--warn,
.status-chip--warn {
  background: rgba(255, 216, 107, 0.14);
  color: #ffe286;
}

.status-chip--alert {
  background: rgba(255, 132, 132, 0.14);
  color: #ffb7b7;
}

.empty-state {
  display: grid;
  gap: 10px;
  place-items: center;
  min-height: 320px;
  padding: 24px;
  border: 1px dashed rgba(255, 216, 107, 0.16);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
    radial-gradient(circle at top right, rgba(255, 216, 107, 0.1), transparent 32%);
  text-align: center;
}

.board-shell--gateway {
  padding: 0;
}

.board-shell--gateway .masthead,
.board-shell--gateway .metric-grid {
  display: none;
}

.board-shell--gateway .board-panel {
  min-height: 100vh;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  padding: 26px 28px;
}

.board-shell--gateway .board-panel__header {
  align-items: flex-start;
}

.board-shell--gateway .board-panel h2 {
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  letter-spacing: 0.02em;
}

.board-shell--gateway .board-panel__subtext {
  font-size: 1.08rem;
}

.board-shell--gateway .table-shell {
  flex: 1;
  border-radius: 20px;
}

.board-shell--gateway .departure-table thead th {
  padding: 18px 20px;
  font-size: 0.88rem;
}

.board-shell--gateway .board-row td {
  padding: 15px 20px;
}

.board-shell--gateway .departure-table__cell {
  font-size: 1.18rem;
}

.board-shell--gateway .departure-table__cell--time,
.board-shell--gateway .departure-table__cell--flight,
.board-shell--gateway .departure-table__cell--gate,
.board-shell--gateway .departure-table__cell--terminal {
  font-size: 1.26rem;
}

.board-shell--gateway .delay-pill,
.board-shell--gateway .status-chip {
  min-height: 38px;
  font-size: 0.92rem;
}

.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.banner-fade-enter,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes board-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes split-flap-in {
  0% {
    opacity: 0;
    transform: perspective(720px) rotateX(-88deg) translateY(-16px);
    filter: brightness(1.55);
  }

  45% {
    opacity: 1;
    transform: perspective(720px) rotateX(16deg) translateY(0);
    filter: brightness(1.16);
  }

  100% {
    opacity: 1;
    transform: perspective(720px) rotateX(0deg);
    filter: brightness(1);
  }
}

@media (max-width: 1180px) {
  .masthead,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .board-shell {
    padding: 18px 14px 28px;
  }

  .masthead__intro,
  .control-panel,
  .board-panel {
    padding: 20px;
  }

  .airport-lockup {
    grid-template-columns: 1fr;
  }

  .airport-code-panel {
    min-height: auto;
  }

  .airport-copy {
    padding-top: 0;
  }

  .signal-strip,
  .metric-grid,
  .search-shell {
    grid-template-columns: 1fr;
  }

  .board-panel__header,
  .board-panel__actions,
  .board-meta-ribbon,
  .board-legend,
  .board-panel__buttons {
    justify-items: stretch;
    justify-content: flex-start;
  }

  .board-button {
    width: 100%;
  }

  .departure-table {
    min-width: 980px;
  }

  .meta-strip {
    flex-direction: column;
  }
}
</style>
