import fetch from 'node-fetch';
import worker from '../index';
import { errorHandler } from '../utils/errorHandler';

jest.mock('../utils/errorHandler');
jest.mock('node-fetch');

const { Response, Request } = jest.requireActual('node-fetch');

describe('index', () => {
	const originalEnv = {
		CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN as string,
		HELIUS_API_KEY: process.env.HELIUS_API_KEY as string,
		SESSION_KEY: process.env.SESSION_KEY as string,
		AWS_REGION: process.env.AWS_REGION as string,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID as string,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY as string,
		AWS_CLOUDWATCH_LOG_GROUP: process.env.AWS_CLOUDWATCH_LOG_GROUP as string,
	};

	test('does not invoke errorHandler', async () => {
		(errorHandler as jest.Mock).mockImplementation();
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
			new Response(undefined, { status: 200 })
		);

		const request = new Request(
			`https://solana-rpc.web.helium.io/?session-key=${originalEnv.SESSION_KEY}`,
			{
				method: 'GET',
				headers: {
					Host: 'solana-rpc.web.helium.io',
				},
			}
		) as unknown as Parameters<typeof worker.fetch>[0];

		await worker.fetch(request, originalEnv);

		expect(errorHandler).not.toBeCalled();
	});

	test('does invoke errorHandler', async () => {
		(errorHandler as jest.Mock).mockImplementation();
		(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
			new Response(undefined, { status: 400 })
		);

		const request = new Request(
			`https://solana-rpc.web.helium.io/?session-key=${originalEnv.SESSION_KEY}`,
			{
				method: 'GET',
				headers: {
					Host: 'solana-rpc.web.helium.io',
				},
			}
		) as unknown as Parameters<typeof worker.fetch>[0];

		await worker.fetch(request, originalEnv);

		expect(errorHandler).toBeCalled();
	});
});
