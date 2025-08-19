import { z } from "zod";
import { ToolHandler } from "./types.js";

interface WeatherParams {
  city: string;
  country?: string;
  units?: "metric" | "imperial" | "kelvin";
}

interface WeatherResponse {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  description: string;
  timestamp: string;
  units: {
    temperature: string;
    windSpeed: string;
    pressure: string;
    visibility: string;
  };
}

// Mock weather conditions
const weatherConditions = [
  { condition: "Sunny", description: "Clear sky with bright sunshine" },
  { condition: "Partly Cloudy", description: "Some clouds with sunny intervals" },
  { condition: "Cloudy", description: "Overcast with thick clouds" },
  { condition: "Rainy", description: "Light to moderate rainfall" },
  { condition: "Heavy Rain", description: "Heavy rainfall with strong winds" },
  { condition: "Thunderstorm", description: "Thunderstorms with lightning" },
  { condition: "Snowy", description: "Light to moderate snowfall" },
  { condition: "Foggy", description: "Dense fog reducing visibility" },
  { condition: "Windy", description: "Strong winds with clear skies" },
  { condition: "Drizzle", description: "Light drizzle with overcast skies" }
];

// Function to generate deterministic but varied mock data based on city name
function generateMockWeather(city: string, country: string, units: string): WeatherResponse {
  // Use city name to generate consistent but varied data
  const cityHash = city.toLowerCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const countryHash = country.toLowerCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const combinedHash = cityHash + countryHash;

  // Generate temperature based on hash (simulate seasonal and geographic variation)
  let baseTemp: number;
  let tempUnit: string;
  let windUnit: string;
  let pressureUnit: string;
  let visibilityUnit: string;

  switch (units) {
    case "imperial":
      baseTemp = 32 + (combinedHash % 80); // 32°F to 112°F
      tempUnit = "°F";
      windUnit = "mph";
      pressureUnit = "inHg";
      visibilityUnit = "miles";
      break;
    case "kelvin":
      baseTemp = 250 + (combinedHash % 80); // 250K to 330K
      tempUnit = "K";
      windUnit = "m/s";
      pressureUnit = "hPa";
      visibilityUnit = "km";
      break;
    default: // metric
      baseTemp = -10 + (combinedHash % 50); // -10°C to 40°C
      tempUnit = "°C";
      windUnit = "m/s";
      pressureUnit = "hPa";
      visibilityUnit = "km";
  }

  const temperature = baseTemp;
  const feelsLike = temperature + (combinedHash % 6) - 3; // ±3 degrees difference
  const humidity = 30 + (combinedHash % 60); // 30% to 90%
  const pressure = units === "imperial" ? 29.5 + (combinedHash % 200) / 100 : 1000 + (combinedHash % 50); // 29.5-31.5 inHg or 1000-1050 hPa
  const windSpeed = (combinedHash % 25) + 1; // 1-25 wind speed
  const windDirection = combinedHash % 360; // 0-359 degrees
  const visibility = units === "imperial" ? 5 + (combinedHash % 15) : 8 + (combinedHash % 22); // 5-20 miles or 8-30 km
  const uvIndex = Math.max(1, combinedHash % 12); // 1-11 UV index

  // Select weather condition based on hash
  const weatherCondition = weatherConditions[combinedHash % weatherConditions.length];

  return {
    city,
    country,
    temperature: Math.round(temperature * 10) / 10,
    feelsLike: Math.round(feelsLike * 10) / 10,
    humidity,
    pressure: Math.round(pressure * 10) / 10,
    windSpeed: Math.round(windSpeed * 10) / 10,
    windDirection,
    visibility: Math.round(visibility * 10) / 10,
    uvIndex,
    condition: weatherCondition.condition,
    description: weatherCondition.description,
    timestamp: new Date().toISOString(),
    units: {
      temperature: tempUnit,
      windSpeed: windUnit,
      pressure: pressureUnit,
      visibility: visibilityUnit
    }
  };
}

export const getWeatherTool: ToolHandler<WeatherParams> = {
  name: "get-weather",
  description: "Tool para obtener información meteorológica actual de cualquier ciudad (datos simulados)",
  schema: {
    city: z.string().describe("Nombre de la ciudad para consultar el clima"),
    country: z.string().optional().default("Unknown").describe("País donde se encuentra la ciudad (opcional)"),
    units: z.enum(["metric", "imperial", "kelvin"]).optional().default("metric").describe("Unidades de medida: metric (°C, m/s), imperial (°F, mph), kelvin (K, m/s)")
  },
  handler: async ({ city, country = "Unknown", units = "metric" }) => {
    try {
      // Generate mock weather data
      const weatherData = generateMockWeather(city, country, units);
      
      // Format the response
      const weatherReport = `🌤️  **Clima actual en ${weatherData.city}, ${weatherData.country}**

📊 **Condiciones Generales:**
• Estado: ${weatherData.condition}
• Descripción: ${weatherData.description}
• Última actualización: ${new Date(weatherData.timestamp).toLocaleString()}

🌡️  **Temperatura:**
• Actual: ${weatherData.temperature}${weatherData.units.temperature}
• Sensación térmica: ${weatherData.feelsLike}${weatherData.units.temperature}

💨 **Viento y Atmósfera:**
• Velocidad del viento: ${weatherData.windSpeed} ${weatherData.units.windSpeed}
• Dirección del viento: ${weatherData.windDirection}°
• Humedad: ${weatherData.humidity}%
• Presión atmosférica: ${weatherData.pressure} ${weatherData.units.pressure}

👁️  **Visibilidad y UV:**
• Visibilidad: ${weatherData.visibility} ${weatherData.units.visibility}
• Índice UV: ${weatherData.uvIndex}

---
*Nota: Estos son datos simulados para fines de demostración*`;

      return {
        content: [
          {
            type: "text",
            text: weatherReport
          }
        ],
        _meta: {
          source: "mock-weather-service",
          generatedAt: weatherData.timestamp,
          units: units
        }
      };
    } catch (error: any) {
      console.error("Error generating weather data:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error al obtener información meteorológica para ${city}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
};
