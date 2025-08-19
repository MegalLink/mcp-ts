import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { getWeatherTool } from '../../tools/get-weather.js';

import chai from 'chai';
chai.use(sinonChai as any);

let sandbox: sinon.SinonSandbox;

describe('getWeatherTool', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('handler', () => {
    it('should return weather data for a city with default parameters', async () => {
      const result = await getWeatherTool.handler({
        city: 'Madrid'
      });
      
      expect(result.content).to.have.length(1);
      expect(result.content[0].type).to.equal('text');
      expect(result.content[0].text).to.include('Madrid');
      expect(result.content[0].text).to.include('Clima actual');
      expect(result._meta).to.exist;
      expect(result._meta?.source).to.equal('mock-weather-service');
      expect(result._meta?.units).to.equal('metric');
    });

    it('should return weather data with imperial units', async () => {
      const result = await getWeatherTool.handler({
        city: 'New York',
        country: 'USA',
        units: 'imperial'
      });
      
      expect(result.content).to.have.length(1);
      expect(result.content[0].type).to.equal('text');
      expect(result.content[0].text).to.include('New York');
      expect(result.content[0].text).to.include('USA');
      expect(result.content[0].text).to.include('°F');
      expect(result.content[0].text).to.include('mph');
      expect(result._meta?.units).to.equal('imperial');
    });

    it('should return weather data with kelvin units', async () => {
      const result = await getWeatherTool.handler({
        city: 'Tokyo',
        country: 'Japan',
        units: 'kelvin'
      });
      
      expect(result.content).to.have.length(1);
      expect(result.content[0].type).to.equal('text');
      expect(result.content[0].text).to.include('Tokyo');
      expect(result.content[0].text).to.include('Japan');
      expect(result.content[0].text).to.include('K');
      expect(result._meta?.units).to.equal('kelvin');
    });

    it('should return consistent data for the same city', async () => {
      const result1 = await getWeatherTool.handler({
        city: 'London',
        country: 'UK'
      });
      
      const result2 = await getWeatherTool.handler({
        city: 'London',
        country: 'UK'
      });
      
      // Extract temperature from both results
      const tempRegex = /Actual: ([\d.-]+)°C/;
      const temp1Match = (result1.content[0] as { text: string }).text.match(tempRegex);
      const temp2Match = (result2.content[0] as { text: string }).text.match(tempRegex);
      
      expect(temp1Match).to.not.be.null;
      expect(temp2Match).to.not.be.null;
      expect(temp1Match![1]).to.equal(temp2Match![1]); // Same temperature for same city
    });

    it('should return different data for different cities', async () => {
      const result1 = await getWeatherTool.handler({
        city: 'Paris'
      });
      
      const result2 = await getWeatherTool.handler({
        city: 'Berlin'
      });
      
      // Extract temperature from both results
      const tempRegex = /Actual: ([\d.-]+)°C/;
      const temp1Match = (result1.content[0] as { text: string }).text.match(tempRegex);
      const temp2Match = (result2.content[0] as { text: string }).text.match(tempRegex);
      
      expect(temp1Match).to.not.be.null;
      expect(temp2Match).to.not.be.null;
      expect(temp1Match![1]).to.not.equal(temp2Match![1]); // Different temperatures for different cities
    });

    it('should handle default country when not provided', async () => {
      const result = await getWeatherTool.handler({
        city: 'Sydney'
      });
      
      expect(result.content).to.have.length(1);
      expect(result.content[0].text).to.include('Sydney, Unknown');
    });

    it('should include all required weather information', async () => {
      const result = await getWeatherTool.handler({
        city: 'Barcelona',
        country: 'Spain'
      });
      
      const weatherText = (result.content[0] as { text: string }).text;
      
      // Check for all required weather information
      expect(weatherText).to.include('Temperatura:');
      expect(weatherText).to.include('Actual:');
      expect(weatherText).to.include('Sensación térmica:');
      expect(weatherText).to.include('Velocidad del viento:');
      expect(weatherText).to.include('Dirección del viento:');
      expect(weatherText).to.include('Humedad:');
      expect(weatherText).to.include('Presión atmosférica:');
      expect(weatherText).to.include('Visibilidad:');
      expect(weatherText).to.include('Índice UV:');
      expect(weatherText).to.include('Estado:');
      expect(weatherText).to.include('Descripción:');
    });
  });

  describe('tool definition', () => {
    it('should have correct tool name and description', () => {
      expect(getWeatherTool.name).to.equal('get-weather');
      expect(getWeatherTool.description).to.include('meteorológica');
    });

    it('should have correct schema definition', () => {
      expect(getWeatherTool.schema.city).to.exist;
      expect(getWeatherTool.schema.country).to.exist;
      expect(getWeatherTool.schema.units).to.exist;
    });
  });
});
