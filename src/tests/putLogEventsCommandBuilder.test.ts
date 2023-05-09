import 'aws-sdk-client-mock-jest';
import { PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { putLogEventsCommandBuilder } from '../utils/putLogEventsCommandBuilder';
import { Env } from '../types';

Date.now = jest.fn(() => 1487076708000);

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
	return {
		PutLogEventsCommand: jest.fn().mockImplementation(),
	};
});

describe('putLogEventsCommandBuilder', () => {
	const originalEnv = {
		CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN,
		HELIUS_API_KEY: process.env.HELIUS_API_KEY,
		SESSION_KEY: process.env.SESSION_KEY,
		AWS_REGION: process.env.AWS_REGION,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_CLOUDWATCH_LOG_GROUP: process.env.AWS_CLOUDWATCH_LOG_GROUP,
	};

	test('creates a command', () => {
		const args = {
			env: originalEnv as Env,
			currentDate: 'yyyy-mm-dd',
			requestMethod: 'requestMethod',
			statusCode: 200,
			statusMessage: 'statusMessage',
			responseBody: 'responseBody',
		};

		putLogEventsCommandBuilder(args);

		expect(PutLogEventsCommand).toBeCalledWith({
			logGroupName: originalEnv.AWS_CLOUDWATCH_LOG_GROUP,
			logStreamName: args.currentDate,
			logEvents: [
				{
					timestamp: Date.now(),
					message: `Error ${args.requestMethod} ${args.statusCode} ${args.statusMessage} ${args.responseBody}`,
				},
			],
		});
	});
});
