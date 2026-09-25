/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('normalizes uppercase environment values', () => {
  jest.doMock('react-native-config', () => ({
    __esModule: true,
    default: {
      ENV: 'PROD',
      API_URL: 'https://api.example.com',
      ENABLE_LOGS: 'false',
    },
  }));

  jest.isolateModules(() => {
    const { AppConfig } = require('../src/config') as typeof import('../src/config');
    expect(AppConfig.env).toBe('prod');
    expect(AppConfig.apiUrl).toBe('https://api.example.com');
  });

  jest.dontMock('react-native-config');
});
