export interface Airline {
  iataCode: string;
  icaoCode: string;
  name: string;
}

export interface Arrival {
  actualRunway?: Date;
  actualTime?: Date;
  baggage: string;
  delay: string;
  estimatedRunway?: Date;
  estimatedTime?: Date;
  gate: string;
  iataCode: string;
  icaoCode: string;
  scheduledTime: Date;
  terminal: string;
}

export interface Flight {
  iataNumber: string;
  icaoNumber: string;
  number: string;
}

export interface Codeshared {
  airline: Airline;
  flight: Flight;
}

export interface Departure {
  actualRunway?: Date;
  actualTime?: Date;
  baggage?: any;
  delay: string;
  estimatedRunway?: Date;
  estimatedTime?: Date;
  gate: string;
  iataCode: string;
  icaoCode: string;
  scheduledTime: Date;
  terminal: string;
}

export interface FlightsTableDeparture {
  airline: Airline;
  arrival: Arrival;
  codeshared: Codeshared;
  departure: Departure;
  flight: Flight;
  status: string;
  type: string;
}
