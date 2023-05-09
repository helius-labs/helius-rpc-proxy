/* eslint-disable no-undef */
/*eslint-env node*/

import fetch from 'jest-fetch-mock';
fetch.enableMocks();

jest.setMock('node-fetch', fetch);

process.env.CORS_ALLOW_ORIGIN = 'CORS_ALLOW_ORIGIN';
process.env.HELIUS_API_KEY = 'HELIUS_API_KEY';
process.env.SESSION_KEY = 'SESSION_KEY';
process.env.AWS_REGION = 'AWS_REGION';
process.env.AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
process.env.AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
process.env.AWS_CLOUDWATCH_LOG_GROUP = 'AWS_CLOUDWATCH_LOG_GROUP';
