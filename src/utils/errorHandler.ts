import { Env } from '../types';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { createLogStreamCommandBuilder } from './createLogStreamCommandBuilder';
import { putLogEventsCommandBuilder } from './putLogEventsCommandBuilder';

export const errorHandler = async ({
	env,
	req,
	res,
}: {
	env: Env;
	req: Request;
	res: Response;
}): Promise<void> => {
	// Instantiate CloudWatchLogsClient
	const client = new CloudWatchLogsClient({
		region: env.AWS_REGION,
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});

	// Build date in yyyy-mm-dd form for CloudWatch stream name
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : today.getMonth() + 1;
	const day = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
	const currentDate = `${year}-${month}-${day}`;

	// Build CloudWatch createLogStreamCommand
	const createLogStreamCommandArg = {
		env,
		currentDate,
	};
	const createLogStreamCommand = createLogStreamCommandBuilder(createLogStreamCommandArg);

	// Build CloudWatch putLogEventsCommand
	const responseBody = await res.text();
	const putLogEventsCommandArg = {
		env,
		currentDate,
		requestMethod: req.method,
		statusCode: res.status,
		statusMessage: res.statusText,
		responseBody: responseBody,
	};
	const putLogEventsCommand = putLogEventsCommandBuilder(putLogEventsCommandArg);

	// Try to create CloudWatch stream, catch error as it usually means the stream
	// already exists, which is ok
	try {
		const awsRes = await client.send(createLogStreamCommand);
		console.log(`CloudWatch createLogStream response: ${JSON.stringify(awsRes)}`);
	} catch (err) {
		console.log(
			`CloudWatch createLogStream error (if stream exists, can be ignored): ${JSON.stringify(err)}`
		);
	}

	// Send log
	const awsRes = await client.send(putLogEventsCommand);

	const heliusResponse = `${putLogEventsCommandArg.statusCode} ${putLogEventsCommandArg.requestMethod} ${putLogEventsCommandArg.statusMessage} ${putLogEventsCommandArg.responseBody}`;
	console.log(`Helius response: ${heliusResponse}`);
	console.log(`CloudWatch log response: ${JSON.stringify(awsRes)}`);

	return;
};
