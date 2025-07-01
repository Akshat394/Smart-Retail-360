import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export async function optimizeRoute(stops: string[], apiKey: string) {
  const response = await client.directions({
    params: {
      origin: stops[0],
      destination: stops[stops.length - 1],
      waypoints: stops.slice(1, -1),
      optimize: true,
      key: apiKey,
    },
    timeout: 10000,
  });
  return response.data;
} 