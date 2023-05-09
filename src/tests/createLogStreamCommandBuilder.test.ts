import 'aws-sdk-client-mock-jest';
import { CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { createLogStreamCommandBuilder } from '../utils/createLogStreamCommandBuilder';
import { Env } from '../types';

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
	return {
		CreateLogStreamCommand: jest.fn().mockImplementation(),
	};
});

describe('createLogStreamCommandBuilder', () => {
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
		};

		createLogStreamCommandBuilder(args);

		expect(CreateLogStreamCommand).toBeCalledWith({
			logGroupName: originalEnv.AWS_CLOUDWATCH_LOG_GROUP,
			logStreamName: args.currentDate,
		});
	});
});
